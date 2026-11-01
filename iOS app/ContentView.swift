import SwiftUI
import CoreBluetooth
import Combine
// Models
enum WorkoutType: String, CaseIterable, Identifiable {
case backSquat = "Back Squat", benchPress = "Bench Press", deadlift = "Deadlift"
var id: String { rawValue }
}
struct LiftProfile {
let rangeOfMotion: Float // metres average concentric ROM for this lift
let up: Float // baseline expected velocity m/s, used as fallback
static let all: [WorkoutType: LiftProfile] = [
.backSquat: .init(rangeOfMotion: 0.45, up: 0.64),
.benchPress: .init(rangeOfMotion: 0.30, up: 0.45),
.deadlift: .init(rangeOfMotion: 0.65, up: 0.70),
]
// Implied velocity = known ROM / measured phase time
func impliedV(ms: UInt32) -> Float {
ms > 0 ? rangeOfMotion / (Float(ms) / 1000) : 0
}
}
private let SANITY: Float = 2.0
struct Rep: Identifiable {
let id = UUID()
let up, down: Float
let upMs, downMs: UInt32
}
struct WorkoutConfig { var type: WorkoutType = .backSquat }
struct Athlete: Identifiable {
let id = UUID()
var name: String
var reps: [Rep] = []
var config = WorkoutConfig()
var avgUp: Float? { reps.isEmpty ? nil : reps.map { resolved($0) }.reduce(0,+) / Float(reps.count) }
func resolved(_ rep: Rep) -> Float {
guard let p = LiftProfile.all[config.type] else { return rep.up }
// Implied velocity from ROM / time measured by device
let iU = p.impliedV(ms: rep.upMs)
// Weight raw IMU reading by how close it is to the implied value
// if they agree, trust raw. if they diverge, blend toward implied
let wU = 1 / (1 + fabsf(rep.up - iU) / SANITY)
return wU * rep.up + (1 - wU) * iU
}
}
// Battery
func lipoPct(_ v: Float) -> Float {
switch v {
case ..<3.0: return 0
case 3.0..<3.3: return (v-3.0)/0.3*5
case 3.3..<3.6: return 5 + (v-3.3)/0.3*15
case 3.6..<3.7: return 20 + (v-3.6)/0.1*10
case 3.7..<3.8: return 30 + (v-3.7)/0.1*25
case 3.8..<3.9: return 55 + (v-3.8)/0.1*20
case 3.9..<4.0: return 75 + (v-3.9)/0.1*10
case 4.0..<4.1: return 85 + (v-4.0)/0.1*10
case 4.1..<4.2: return 95 + (v-4.1)/0.1*4
default: return 99
}
}
// BLE
final class BatteryState: ObservableObject { @Published var voltage: Float? }
final class BLE: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
@Published var state: BLEState = .off
@Published var found: [CBPeripheral] = []
var batteryVoltage: Float?
let batteryState = BatteryState()
enum BLEState { case off, idle, scanning, connected }
var isConnected: Bool { state == .connected }
var onRep: ((Float, Float, UInt32, UInt32) -> Void)?
private var central: CBCentralManager!
private var peripheral: CBPeripheral?
private var upChar, dnChar, cmdChar, timeChar, batChar: CBCharacteristic?
private var pUp: Float?, pDn: Float?, pUpMs: UInt32?, pDnMs: UInt32?
private let svcID = CBUUID(string: "4fafc201-1fb5-459e-8fcc-c5c9c331914b")
private let upID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26ab")
private let dnID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26ac")
private let cmdID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26ad")
private let timeID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26ae")
private let batID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26af")
override init() { super.init(); central = CBCentralManager(delegate: self, queue: DispatchQueue(label:
"ble.queue", qos: .userInitiated)) }
func scan() { guard central.state == .poweredOn else { return }; found.removeAll();
central.scanForPeripherals(withServices: [svcID]); state = .scanning }
func stopScan() { central.stopScan(); if state == .scanning { state = .idle } }
func connect(_ p: CBPeripheral) { stopScan(); peripheral = p; p.delegate = self; central.connect(p) }
func disconnect() { peripheral.map { central.cancelPeripheralConnection($0) } }
func sendCAL() {
guard let p = peripheral, let ch = cmdChar else { return }
let t: CBCharacteristicWriteType = ch.properties.contains(.write) ? .withResponse : .withoutResponse
p.writeValue("CAL\n".data(using: .utf8)!, for: ch, type: t)
}
func centralManagerDidUpdateState(_ c: CBCentralManager) {
DispatchQueue.main.async { [weak self] in self?.state = c.state == .poweredOn ? .idle : .off; if self?.state ==
.off { self?.stopScan() } }
}
func centralManager(_ c: CBCentralManager, didDiscover p: CBPeripheral, advertisementData: [String:Any],
rssi _: NSNumber) {
let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? p.name ?? ""
guard name.hasPrefix("Iron-Dread") else { return }
DispatchQueue.main.async { [weak self] in
guard let self, !self.found.contains(where: { $0.identifier == p.identifier }) else { return }
self.found.append(p)
}
}
func centralManager(_ c: CBCentralManager, didConnect p: CBPeripheral) { DispatchQueue.main.async {
[weak self] in self?.state = .connected }; p.discoverServices([svcID]) }
func centralManager(_ c: CBCentralManager, didDisconnectPeripheral p: CBPeripheral, error: Error?) {
upChar = nil; dnChar = nil; cmdChar = nil; timeChar = nil; batChar = nil
pUp = nil; pDn = nil; pUpMs = nil; pDnMs = nil; peripheral = nil
DispatchQueue.main.async { [weak self] in self?.state = .idle; self?.batteryVoltage = nil;
self?.batteryState.voltage = nil }
}
func centralManager(_ c: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) { peripheral =
nil; DispatchQueue.main.async { [weak self] in self?.state = .idle } }
func peripheral(_ p: CBPeripheral, didDiscoverServices _: Error?) {
p.services?.filter { $0.uuid == svcID }.forEach { p.discoverCharacteristics([upID, dnID, cmdID, timeID, batID],

for: $0) }
}
func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor svc: CBService, error _: Error?) {
svc.characteristics?.forEach { ch in
switch ch.uuid {
case upID: upChar = ch; p.setNotifyValue(true, for: ch)
case dnID: dnChar = ch; p.setNotifyValue(true, for: ch)
case timeID: timeChar = ch; p.setNotifyValue(true, for: ch)
case batID: batChar = ch; p.setNotifyValue(true, for: ch)
case cmdID: cmdChar = ch
default: break
}
}
}
func peripheral(_ p: CBPeripheral, didUpdateValueFor ch: CBCharacteristic, error _: Error?) {
guard let raw = ch.value, let s = String(data: raw, encoding: .utf8)?.trimmingCharacters(in:
.whitespacesAndNewlines) else { return }
switch ch.uuid {
case upID: if let v = Float(s) { pUp = v }; tryEmit()
case dnID: if let v = Float(s) { pDn = v }; tryEmit()
case timeID:
let parts = s.split(separator: ":", maxSplits: 1)
guard parts.count == 2, let ms = UInt32(parts[1]) else { return }
if parts[0] == "UP" { pUpMs = ms } else { pDnMs = ms }; tryEmit()
case batID:
guard s.hasPrefix("BAT:"), let v = Float(s.dropFirst(4)) else { return }
DispatchQueue.main.async { [weak self] in self?.batteryState.voltage = v; self?.batteryVoltage = v }
default: break
}
}
private func tryEmit() {
guard let up = pUp, let dn = pDn, let upMs = pUpMs, let dnMs = pDnMs else { return }
pUp = nil; pDn = nil; pUpMs = nil; pDnMs = nil
DispatchQueue.main.async { [weak self] in self?.onRep?(up, dn, upMs, dnMs) }
}
}
// UI Helpers
private func velColor(_ v: Float) -> Color { v >= 0.8 ? .green : v >= 0.5 ? .orange : .red }
private func batColor(_ p: Float) -> Color { p > 50 ? .green : p > 20 ? .orange : .red }
//Content View
struct ContentView: View {
@StateObject private var ble = BLE()
@State private var athletes: [Athlete] = []
@State private var activeIdx: Int?
@State private var selectedTab = 0
@State private var newName = ""
@State private var showAddAthlete = false
@State private var showCal = false
var body: some View {
TabView(selection: $selectedTab) {
connectTab.tabItem { Label("Connect", systemImage: "antenna.radiowaves.left.and.right") }.tag(0)
ForEach(athletes.indices, id: \.self) { i in
athleteTab(i).tabItem { Label(athletes[i].name, systemImage: "person.fill") }.tag(i + 1)
}
}
.onAppear {
ble.onRep = { up, dn, upMs, dnMs in
guard let i = activeIdx, athletes.indices.contains(i) else { return }
athletes[i].reps.append(Rep(up: dn, down: up, upMs: dnMs, downMs: upMs))
}
}
.alert("New Athlete", isPresented: $showAddAthlete) {
TextField("Name", text: $newName)
Button("Add") {
let n = newName.trimmingCharacters(in: .whitespacesAndNewlines)
guard !n.isEmpty else { return }
athletes.append(Athlete(name: n)); activeIdx = athletes.count - 1; selectedTab = athletes.count
}
Button("Cancel", role: .cancel) {}
}
.overlay { if showCal { calOverlay } }
}
// Connect Tab
private var connectTab: some View {
NavigationStack {
List {
Section("Device") {
HStack {
Label(bleLabel, systemImage: "dot.radiowaves.left.and.right")
Spacer()
if let v = ble.batteryState.voltage {
Text(String(format: "%.2fV \(Int(lipoPct(v)))%%",
v)).foregroundStyle(batColor(lipoPct(v))).font(.caption)
}
}
switch ble.state {
case .idle: Button("Scan", action: ble.scan)
case .scanning: Button("Stop Scanning", action: ble.stopScan)
case .connected: Button("Calibrate") { ble.sendCAL(); showCal = true }
Button("Disconnect", role: .destructive, action: ble.disconnect)
case .off: Text("Bluetooth Off").foregroundStyle(.secondary)
}
}
if !ble.found.isEmpty {
Section("Found") {
ForEach(ble.found, id: \.identifier) { p in
Button(p.name ?? "Iron-Dread") { ble.connect(p) }
}
}
}
Section("Athletes") {
ForEach(athletes.indices, id: \.self) { i in
HStack { Text(athletes[i].name); Spacer(); if activeIdx == i {
Text("LIVE").font(.caption).foregroundStyle(.orange) } }
}.onDelete { idx in idx.forEach { i in athletes.remove(at: i); if activeIdx == i { activeIdx = nil } } }
Button("Add Athlete") { newName = ""; showAddAthlete = true }
}
}
.navigationTitle("Iron Dread")
}
}
private var bleLabel: String {
switch ble.state { case .connected: "Connected"; case .scanning: "Scanning..."; case .idle: "Not connected";
case .off: "BT Off" }
}
// Athlete Tab
private func athleteTab(_ i: Int) -> some View {
NavigationStack {
List {
Section {
let r = athletes[i].reps.last.map { athletes[i].resolved($0) }
HStack {
Text(r.map { String(format: "%.2f m/s", $0) } ?? "--").font(.largeTitle.bold().monospaced())
.foregroundStyle(r.map { velColor($0) } ?? .secondary)
Spacer()
if let avg = athletes[i].avgUp {
VStack(alignment: .trailing) {
Text(String(format: "%.2f", avg)).font(.headline.monospaced())
Text("avg · \(athletes[i].reps.count) reps").font(.caption).foregroundStyle(.secondary)
}
}
}
Picker("Lift", selection: $athletes[i].config.type) {
ForEach(WorkoutType.allCases) { Text($0.rawValue).tag($0) }
}
if activeIdx == i {
Button("Clear Reps", role: .destructive) { athletes[i].reps = [] }
} else {
Button(ble.isConnected ? "Assign & Start" : "No Device") {
guard ble.isConnected else { return }
athletes[i].reps = []; activeIdx = i; selectedTab = i + 1
}.disabled(!ble.isConnected)
}
}
if !athletes[i].reps.isEmpty {
Section("Reps") {
ForEach(athletes[i].reps.indices.reversed(), id: \.self) { j in
let rep = athletes[i].reps[j]; let v = athletes[i].resolved(rep)
HStack {
Text("#\(j+1)").foregroundStyle(.secondary).font(.caption.monospaced())
Spacer()
Text(String(format: "%.2f", v)).foregroundStyle(velColor(v)).font(.body.monospaced())
Text("\(rep.upMs)ms↑").font(.caption.monospaced()).foregroundStyle(.secondary)
Text("\(rep.downMs)ms↓").font(.caption.monospaced()).foregroundStyle(.tertiary)
}
}
}
}
}
.navigationTitle(athletes[i].name)
.navigationBarTitleDisplayMode(.inline)
}
}
// Cal Overlay
private var calOverlay: some View {
ZStack {
Color.black.opacity(0.6).ignoresSafeArea()
VStack(spacing: 12) {
ProgressView().scaleEffect(1.5)
Text("Calibrating...").font(.headline)
Text("Hold device still").foregroundStyle(.secondary)
}
.padding(32).background(.regularMaterial).clipShape(RoundedRectangle(cornerRadius: 16))
}
.onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 5) { showCal = false } }
}
}
#Preview { ContentView() }
