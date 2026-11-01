/* On a service detail page, point every "quote" CTA at that service's
   public brief: ../quote.html?service=<slug>. No account required — the
   visitor lands directly in this service's quote flow and can submit a
   brief anonymously. */
(function () {
  var m = location.pathname.match(/services\/([^\/?#]+)\.html/i);
  if (!m) return;
  var target = "../quote.html?service=" + encodeURIComponent(m[1]);
  var links = document.querySelectorAll("a.btn");
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    if ((a.textContent || "").toLowerCase().indexOf("quote") !== -1) {
      a.setAttribute("href", target);
    }
  }
})();
