#include <Arduino.h>
#include <REG.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <math.h>

#define SERIAL1_RX_PIN 44
#define SERIAL1_TX_PIN 43

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_VEL_UP_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26ab"
#define CHAR_VEL_DOWN_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_CMD_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26ad"
#define CHAR_TIME_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26ae"
#define CHAR_BAT_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26af"

#define BAT_PIN              A0
#define BAT_SAMPLE_MS        5000

#define GRAVITY              9.81f
#define ACCEL_ALPHA          0.2f

#define MIN_SWITCH_GAP_MS    150
#define STARTUP_THRESHOLD    0.15f
#define CONFIRM_ACCEL        2.5f
#define FAST_VEL_THRESHOLD   1.5f
#define FAST_CONFIRM_SAMPLES 3

#define AVG_THRESHOLD        0.10f
#define MIN_PHASE_SAMPLES    8

#define ZUPT_ACCEL_THRESH    0.3f
#define ZUPT_VEL_THRESH      0.3f
#define ZUPT_MIN_SAMPLES     15

// BLE variable initializations

BLEServer*         pServer    = nullptr;
BLECharacteristic* pCharVelUp = nullptr;
BLECharacteristic* pCharVelDn = nullptr;
BLECharacteristic* pCharCmd   = nullptr;
BLECharacteristic* pCharTime  = nullptr;
BLECharacteristic* pCharBat   = nullptr;
bool               deviceConnected = false;

static uint32_t lastBatMs = 0;

static uint8_t pkt[11];
static int     pktIndex = 0;
static bool    inPacket = false;

static volatile bool hasAcc  = false;
static volatile bool hasQuat = false;

// Sensor data variable initializers
static float accX = 0.0f, accY = 0.0f, accZ = 0.0f;
static float qW = 1.0f, qX = 0.0f, qY = 0.0f, qZ = 0.0f;

// Post processed sensor data
static float    aWZfilt   = 0.0f;
static float    velWZ     = 0.0f;
static uint32_t lastAccMs = 0;

// Direction of sensor movement variable initializers
static int      currentDirection      = 0;
static uint32_t lastDirectionChangeMs = 0;
static uint32_t phaseStartMs          = 0;

// Velocity averaging variable initializers
static float    phaseVelSum   = 0.0f;
static uint32_t phaseVelCount = 0;

// ZUPT variables
static int zuptCount        = 0;
static int fastConfirmCount = 0;

static volatile bool calGyroAccRequested = false;
static volatile bool calAngleZRequested  = false;

// WT901B UART helpers — no SDK
static void witWrite(uint8_t reg, uint8_t lo, uint8_t hi) {
    uint8_t buf[5] = { 0xFF, 0xAA, reg, lo, hi };
    Serial1.write(buf, 5); Serial1.flush(); delay(50);
}
static void witUnlock() {
    uint8_t u[5] = { 0xFF, 0xAA, KEY, 0x88, 0xB5 };
    Serial1.write(u, 5); Serial1.flush(); delay(80);
}
static void witSave() { witWrite(SAVE, SAVE_PARAM, 0x00); delay(100); }

static void enableAccQuat() { // RSW_ACC=0x002, RSW_Q=0x200 → lo=0x02, hi=0x02
    witUnlock();
    witWrite(RSW,   0x02, 0x02);
    witWrite(RRATE, RRATE_200HZ, 0x00);
    witSave();
}

// Calibration functions
static void witCalGyroAcc() {  // Hold device still for ~3s
    witUnlock();
    witWrite(CALSW, CALGYROACC, 0x00);
    delay(3000);
    witWrite(CALSW, NORMAL, 0x00);
    witSave();
}

static void witCalAngleZ() {   // Zero yaw at current heading
    witUnlock();
    witWrite(CALSW, CALANGLEZ, 0x00);
    delay(200);
    witWrite(CALSW, NORMAL, 0x00);
    witSave();
}

// BLE command handling during connection to iPad
class MyCmdCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* ch) override {
        String cmd = ch->getValue(); cmd.trim();
        if      (cmd.equalsIgnoreCase("CAL"))     calGyroAccRequested = true;
        else if (cmd.equalsIgnoreCase("CALANGZ")) calAngleZRequested  = true;
    }
};

// BLE handling for connection and disconnection, restarting advertising after disconnect
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer*)        override { deviceConnected = true; }
    void onDisconnect(BLEServer* srv) override {
        deviceConnected = false;
        delay(300); srv->getAdvertising()->start();
    }
};

// BLE class to create distinct BLE characteristics
static BLECharacteristic* makeNotifyChar(BLEService* svc, const char* uuid) {
    auto* ch = svc->createCharacteristic(uuid,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    auto* ccc = new BLEDescriptor(BLEUUID((uint16_t)0x2902));
    ccc->setValue("");
    ch->addDescriptor(ccc);
    return ch;
}

static void BLEsetup() {
    BLEDevice::init("Iron-Dread-DR");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    // 15 handles: service + 4 notify chars (char + CCCD each) + 1 write char → 4*3 + 1 + 2 = 15
    BLEService* svc = pServer->createService(BLEUUID(SERVICE_UUID), 15);

    pCharVelUp = makeNotifyChar(svc, CHAR_VEL_UP_UUID);
    pCharVelDn = makeNotifyChar(svc, CHAR_VEL_DOWN_UUID);
    pCharTime  = makeNotifyChar(svc, CHAR_TIME_UUID);
    pCharBat   = makeNotifyChar(svc, CHAR_BAT_UUID);

    pCharCmd = svc->createCharacteristic(CHAR_CMD_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
    pCharCmd->setCallbacks(new MyCmdCallbacks());

    svc->start();
    BLEAdvertising* adv = pServer->getAdvertising();
    adv->addServiceUUID(SERVICE_UUID);
    adv->start();
    Serial.println("# BLE ready — Iron-Dread-DR");
}

// WT901B found to not keep 115200 baud needed to maintain 200Hz data stream so baud is updated every time
static void ensureBaud115200(uint32_t foundBaud) {
    if (foundBaud == 115200) return;
    witUnlock();
    witWrite(BAUD, WIT_BAUD_115200, 0x00);
    witSave();
    delay(200);
    Serial1.end(); delay(50);
    Serial1.begin(115200, SERIAL_8N1, SERIAL1_RX_PIN, SERIAL1_TX_PIN);
    delay(200);
}

// Scan for sensor by  listening for a valid 0x55 frame — no SDK needed
static uint32_t AutoScanSensor() {
    const uint32_t bauds[] = { 9600, 115200 };
    for (size_t i = 0; i < sizeof(bauds)/sizeof(bauds[0]); i++) {
        Serial1.begin(bauds[i], SERIAL_8N1, SERIAL1_RX_PIN, SERIAL1_TX_PIN);
        delay(300);
        uint32_t deadline = millis() + 500;
        uint8_t  buf[11];
        int      idx     = 0;
        bool     hunting = false;
        while (millis() < deadline) {
            if (!Serial1.available()) continue;
            uint8_t b = Serial1.read();
            if (!hunting) {
                if (b == 0x55) { buf[0] = b; idx = 1; hunting = true; }
                continue;
            }
            buf[idx++] = b;
            if (idx >= 11) {
                uint8_t s = 0;
                for (int j = 0; j < 10; j++) s += buf[j];
                if (s == buf[10]) {
                    Serial.print("# found at baud: "); Serial.println(bauds[i]);
                    return bauds[i];
                }
                hunting = false; idx = 0;
            }
        }
        Serial1.end(); delay(50);
    }
    Serial.println("# sensor not detected");
    return 0;
}

static void sendBattery() {
    uint32_t now = millis();
    if (now - lastBatMs < BAT_SAMPLE_MS) return;
    lastBatMs = now;

    // average 16 samples to reduce noise
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) { sum += analogRead(BAT_PIN); delay(10); }

    // 12-bit ADC 3.3V ref 0.5 divider 220K/220K
    float voltage = (sum / 16.0f / 4095.0f) * 3.3f * 2.0f;

    if (deviceConnected) {
        String s = "BAT:" + String(voltage, 3);
        pCharBat->setValue(s.c_str());
        pCharBat->notify();
    }
}

// UART data parsing combine high and low bytes to int16
static int16_t u16i(uint8_t lo, uint8_t hi) { return (int16_t)((hi << 8) | lo); }

static bool checksumOK(const uint8_t* p) { // 11-byte frame, byte 11 is checksum
    uint8_t s = 0;
    for (int i = 0; i < 10; i++) s += p[i];
    return s == p[10];
}

// UART conditional parse after checksum and connection
static void processUART() {
    while (Serial1.available()) {
        uint8_t b = Serial1.read();
        if (!inPacket) {
            if (b == 0x55) { pkt[0] = b; pktIndex = 1; inPacket = true; }
            continue;
        }
        pkt[pktIndex++] = b;
        if (pktIndex >= 11) {
            if (checksumOK(pkt)) {
                if (pkt[1] == WIT_QUATER) {
                    qW = (float)u16i(pkt[2], pkt[3]) / 32768.0f;
                    qX = (float)u16i(pkt[4], pkt[5]) / 32768.0f;
                    qY = (float)u16i(pkt[6], pkt[7]) / 32768.0f;
                    qZ = (float)u16i(pkt[8], pkt[9]) / 32768.0f;
                    hasQuat = true;
                } else if (pkt[1] == WIT_ACC) {
                    accX = (float)u16i(pkt[2], pkt[3]) / 32768.0f * 16.0f;
                    accY = (float)u16i(pkt[4], pkt[5]) / 32768.0f * 16.0f;
                    accZ = (float)u16i(pkt[6], pkt[7]) / 32768.0f * 16.0f;
                    hasAcc = true;
                }
            }
            inPacket = false;
            pktIndex = 0;
        }
    }
}

static void notifyPhase(bool up, float avgVel, uint32_t phaseMs) {
    if (up) { Serial.print("AVG UP:   "); } else { Serial.print("AVG DOWN: "); }
    Serial.print(avgVel, 3);
    Serial.print(" m/s  t="); Serial.print(phaseMs); Serial.println(" ms");
    if (deviceConnected) {
        String sv = String(avgVel, 4);
        BLECharacteristic* pChar = up ? pCharVelUp : pCharVelDn;
        pChar->setValue(sv.c_str());
        pChar->notify();
        String st = String(up ? "UP:" : "DN:") + String(phaseMs);
        pCharTime->setValue(st.c_str());
        pCharTime->notify();
    }
}

static void sensorFusion() {
    if (!hasAcc || !hasQuat) return; // Only runs sensor fusion when it has an intact data stream
    hasAcc = false;

    uint32_t now = millis();
    float dt = (lastAccMs == 0) ? 0.0f : (now - lastAccMs) / 1000.0f;
    lastAccMs = now;
    if (dt <= 0.0f || dt > 0.05f) return;

    // Compute global vertical acceleration from quaternion rotation and raw acceleration
    float aWZ = ((2.0f*(qX*qZ - qW*qY))*accX
               + (2.0f*(qY*qZ + qW*qX))*accY
               + (1.0f - 2.0f*(qX*qX + qY*qY))*accZ
               - 1.0f) * GRAVITY;

    if (fabsf(aWZ) > 30.0f) aWZ = 0.0f; // Ignore acceleration spikes over 30 m/s²

    aWZfilt += ACCEL_ALPHA * (aWZ - aWZfilt); // Low-pass filter
    velWZ   += aWZfilt * dt;                  // Integrate acceleration → velocity

    // ZUPT logic
    if (fabsf(aWZfilt) < ZUPT_ACCEL_THRESH && fabsf(velWZ) < ZUPT_VEL_THRESH) {
        if (++zuptCount >= ZUPT_MIN_SAMPLES) {
            velWZ     = 0.0f;
            zuptCount = 0;
            Serial.println("# ZUPT");
        }
    } else {
        zuptCount = 0;
    }

    // direction determination
    if (currentDirection != 0 && fabsf(velWZ) > AVG_THRESHOLD) {
        phaseVelSum += fabsf(velWZ);
        phaseVelCount++;
    }

    if ((now - lastDirectionChangeMs) >= MIN_SWITCH_GAP_MS) {
        int newDirection = currentDirection;

        if (currentDirection == 0) {
            if      (velWZ >  STARTUP_THRESHOLD) newDirection =  1;
            else if (velWZ < -STARTUP_THRESHOLD) newDirection = -1;
            if (newDirection != 0) fastConfirmCount = 0;

        } else if (fabsf(velWZ) < FAST_VEL_THRESHOLD) {
            fastConfirmCount = 0;
            if (currentDirection ==  1 && velWZ < 0.0f && aWZfilt < -CONFIRM_ACCEL)
                newDirection = -1;
            if (currentDirection == -1 && velWZ > 0.0f && aWZfilt >  CONFIRM_ACCEL)
                newDirection =  1;

        } else {
            bool opposing = (currentDirection ==  1 && aWZfilt < -CONFIRM_ACCEL) ||
                            (currentDirection == -1 && aWZfilt >  CONFIRM_ACCEL);
            if (opposing) {
                if (++fastConfirmCount >= FAST_CONFIRM_SAMPLES)
                    newDirection = -currentDirection;
            } else {
                fastConfirmCount = 0;
            }
        }

        if (newDirection != currentDirection) {
            if (currentDirection != 0 && phaseVelCount >= MIN_PHASE_SAMPLES) {
                float    avgVel  = phaseVelSum / (float)phaseVelCount;
                uint32_t phaseMs = now - phaseStartMs;

                notifyPhase(currentDirection == 1, avgVel, phaseMs);
            }

            phaseVelSum           = 0.0f;
            phaseVelCount         = 0;
            fastConfirmCount      = 0;
            currentDirection      = newDirection;
            lastDirectionChangeMs = now;
            phaseStartMs          = now;
            velWZ                 = 0.0f;

            Serial.print("DIRECTION CHANGE: ");
            if      (currentDirection ==  1) Serial.println("UP");
            else if (currentDirection == -1) Serial.println("DOWN");
            else                             Serial.println("UNKNOWN");
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("# Iron-Dread VBT — booting");

    analogSetAttenuation(ADC_11db); // Improves ADC  linearity across 0–3.3V
    BLEsetup();

    uint32_t foundBaud = AutoScanSensor();
    ensureBaud115200(foundBaud);
    enableAccQuat();

    Serial.println("# Ready");
}

void loop() {
    processUART();
    sensorFusion();
    sendBattery();

    if (calGyroAccRequested) {
        calGyroAccRequested = false;
        witCalGyroAcc();
        enableAccQuat();
    }
    if (calAngleZRequested) {
        calAngleZRequested = false;
        witCalAngleZ();
    }
}
