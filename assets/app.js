/**
 * ARSHIA TV — Full App Logic v5
 * ظاهر جدید + پنل شبکه‌ها + ورود + پشتیبانی + مدیریت + ضبط
 */
(function () {
  "use strict";

  var currentHls = null;
  var currentChannel = null;
  var currentGroup = "همه";
  var mediaRecorder = null;
  var recordedChunks = [];
  var isRecording = false;
  var deferredInstall = null;
  var COLORS = ["#ef4444","#3b82f6","#22c55e","#a855f7","#f59e0b","#06b6d4","#ec4899","#84cc16","#f97316","#14b8a6"];
  var ADMIN_PASS = "arshia1404"; // رمز پنل مدیریت — فقط شما بدانید

  var LOGO_MAP = {
    iranintl:"INTL", azadi:"آزادی", cheshmeh:"عقاب", dej:"دژ", gordafarid:"گرد",
    bbcpersian:"BBC", radiofarda:"فردا", voapersian:"VOA", simayeazadi:"آزادی",
    shorai:"شورا", mihan:"میهن", setareh:"ستاره", iranwire:"Wire", mellig:"ملی",
    kanaljadid:"جدید", zed:"ZED", iranefarda:"فردا", irannr:"NR", pleon:"لئون",
    pulse:"پالس", didgah:"دید", parstv:"پارس",
    pmc:"PMC", pmcroyale:"PR", rjtv:"RJ", avang:"آونگ", navahang:"نوا",
    sunmusic:"سان", t2tv:"T2", persiana_music:"PM", persiana_folk:"PF",
    persiana_nostalgia:"PN", persiana_rap:"PR", persiana_setmix:"SM", afn:"AFN",
    ifilmfa:"IF", ifilm2:"IF2", metafilm:"متا", fx:"FX", toonix:"تون",
    box247:"247", avafamily:"آوا", maahtv:"ماه", tapesh:"تپش", tintv:"TIN",
    arko:"آرکو", royal:"رویال", oxir:"اکسیر", novin:"نوین", ravi:"راوی",
    yourtime:"YT", mtc:"MTC", nettv:"نت", itn:"ITN", omideiran:"امید",
    asil:"اصیل", assirat:"سیرات", alwilayah:"ولایه", persiana_fight:"رزمی"
  };

  /* ========== Utils ========== */
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function shortLogo(ch) {
    if (ch.logo && ch.logo.trim()) return ch.logo;
    return LOGO_MAP[ch.id] || (ch.name || "?").substring(0, 3);
  }

  function getGroups() {
    var set = {};
    (window.CHANNELS || []).forEach(function (c) { if (c.group) set[c.group] = true; });
    return ["همه"].concat(Object.keys(set));
  }

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem("arshia_settings") || "{}");
      if (s.card) $("cardNumber").textContent = s.card;
      return s;
    } catch (e) { return {}; }
  }

  function saveSettings(obj) {
    var cur = loadSettings();
    Object.keys(obj).forEach(function (k) { cur[k] = obj[k]; });
    localStorage.setItem("arshia_settings", JSON.stringify(cur));
    if (cur.card) $("cardNumber").textContent = cur.card;
  }

  /* ========== Auth ========== */
  function getUser() {
    try { return JSON.parse(localStorage.getItem("arshia_user") || "null"); } catch (e) { return null; }
  }

  function setUser(u) {
    if (u) localStorage.setItem("arshia_user", JSON.stringify(u));
    else localStorage.removeItem("arshia_user");
    updateUserUI();
  }

  function updateUserUI() {
    var u = getUser();
    var el = $("drawerUser");
    var btnLogout = $("btnAuthLogout");
    if (u) {
      el.textContent = "وارد شده: " + u.username + (u.phone ? " — " + u.phone : "");
      btnLogout.style.display = "block";
      $("authTitle").textContent = "حساب کاربری";
    } else {
      el.textContent = "وارد نشده‌اید";
      btnLogout.style.display = "none";
      $("authTitle").textContent = "ورود / ثبت‌نام";
    }
  }

  /* ========== UI helpers ========== */
  function openModal(id) {
    var m = $(id);
    if (m) m.classList.add("open");
  }
  function closeModal(id) {
    var m = $(id);
    if (m) m.classList.remove("open");
  }
  function openDrawer() {
    $("drawer").classList.add("open");
    $("drawerOverlay").classList.add("open");
  }
  function closeDrawer() {
    $("drawer").classList.remove("open");
    $("drawerOverlay").classList.remove("open");
  }

  function setOverlay(msg) {
    var o = $("playerOverlay");
    var t = $("overlayMsg");
    if (!msg) { o.style.display = "none"; return; }
    o.style.display = "flex";
    t.textContent = msg;
  }

  /* ========== Channels render ========== */
  function renderTabs() {
    var bar = $("categoryTabs");
    var groups = getGroups();
    bar.innerHTML = groups.map(function (g) {
      return '<button class="cat-tab' + (g === currentGroup ? " active" : "") + '" data-g="' + g + '">' + g + "</button>";
    }).join("");
    qsa(".cat-tab", bar).forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentGroup = btn.getAttribute("data-g");
        renderTabs();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    var box = $("channelsGrid");
    var list = (window.CHANNELS || []).filter(function (c) {
      return currentGroup === "همه" || c.group === currentGroup;
    });
    $("chCount").textContent = list.length + " شبکه";
    box.innerHTML = list.map(function (ch, i) {
      var color = COLORS[i % COLORS.length];
      var active = currentChannel && currentChannel.id === ch.id ? " active-ch" : "";
      return (
        '<div class="ch-card' + active + '" data-id="' + ch.id + '">' +
          '<div class="ch-logo" style="border-color:' + color + '">' + shortLogo(ch) + "</div>" +
          '<div class="ch-name">' + ch.name + "</div>" +
        "</div>"
      );
    }).join("");
    qsa(".ch-card", box).forEach(function (el) {
      el.addEventListener("click", function () {
        var ch = (window.CHANNELS || []).find(function (c) { return c.id === el.getAttribute("data-id"); });
        if (ch) selectChannel(ch);
      });
    });
  }

  /* ========== Player ========== */
  function selectChannel(ch) {
    currentChannel = ch;
    $("channelTitle").textContent = ch.name;
    renderGrid();
    var streams = Array.isArray(ch.streams) ? ch.streams.filter(Boolean) : [];
    if (!streams.length) {
      setOverlay("لینک استریم تعریف نشده");
      return;
    }
    playSequence(streams, 0);
    buildEpg(ch);
  }

  function playSequence(streams, index) {
    var video = $("videoPlayer");
    if (!streams || index >= streams.length) {
      setOverlay("هیچ منبعی پاسخ نداد");
      return;
    }
    var url = streams[index];
    setOverlay("در حال اتصال به منبع " + (index + 1) + "...");

    if (currentHls) {
      try { currentHls.destroy(); } catch (e) {}
      currentHls = null;
    }
    video.removeAttribute("src");
    try { video.load(); } catch (e) {}

    var isHls = /\.m3u8/i.test(url) || /playlist/i.test(url) || /hls/i.test(url);

    if (window.Hls && Hls.isSupported() && isHls) {
      currentHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 24,
        maxMaxBufferLength: 48,
        manifestLoadingTimeOut: 12000,
        fragLoadingTimeOut: 15000
      });
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
      currentHls.on(Hls.Events.MANIFEST_PARSED, function () {
        setOverlay("");
        video.play().catch(function () { setOverlay("یکبار روی تصویر بزنید"); });
      });
      currentHls.on(Hls.Events.ERROR, function (evt, data) {
        if (data.fatal) {
          try { currentHls.destroy(); } catch (e) {}
          currentHls = null;
          playSequence(streams, index + 1);
        }
      });
    } else {
      video.src = url;
      video.load();
      video.play().then(function () { setOverlay(""); })
        .catch(function () { playSequence(streams, index + 1); });
    }
  }

  /* ========== EPG (جدول پخش نمونه) ========== */
  function buildEpg(ch) {
    $("epgChannelName").textContent = ch.name;
    var now = new Date();
    var h = now.getHours();
    var slots = [];
    for (var i = -1; i < 5; i++) {
      var hh = (h + i + 24) % 24;
      var start = (hh < 10 ? "0" : "") + hh + ":00";
      var end = ((hh + 1) % 24 < 10 ? "0" : "") + ((hh + 1) % 24) + ":00";
      var titles = [
        "برنامه زنده " + ch.name,
        "اخبار و گزارش",
        "میان‌برنامه",
        "ویژه برنامه",
        "پخش مستقیم",
        "بازپخش منتخب"
      ];
      slots.push({
        time: start + " – " + end,
        title: titles[(hh + i + 6) % titles.length],
        now: i === 0
      });
    }
    $("epgList").innerHTML = slots.map(function (s) {
      return '<div class="epg-item' + (s.now ? " now" : "") + '">' +
        '<span class="epg-time">' + s.time + "</span>" +
        '<span class="epg-title">' + s.title + (s.now ? " ● الان" : "") + "</span></div>";
    }).join("");
  }

  /* ========== Search ========== */
  function doSearch(q) {
    q = (q || "").trim().toLowerCase();
    var box = $("searchResults");
    if (!q) { box.innerHTML = ""; return; }
    var hits = (window.CHANNELS || []).filter(function (c) {
      return (c.name || "").toLowerCase().indexOf(q) >= 0 ||
             (c.group || "").toLowerCase().indexOf(q) >= 0 ||
             (c.id || "").toLowerCase().indexOf(q) >= 0;
    });
    box.innerHTML = hits.slice(0, 30).map(function (c) {
      return '<div class="search-item" data-id="' + c.id + '">' + c.name +
        ' <span>(' + c.group + ")</span></div>";
    }).join("") || '<div class="search-item">نتیجه‌ای یافت نشد</div>';
    qsa(".search-item[data-id]", box).forEach(function (el) {
      el.addEventListener("click", function () {
        var ch = (window.CHANNELS || []).find(function (c) { return c.id === el.getAttribute("data-id"); });
        if (ch) { closeModal("modalSearch"); selectChannel(ch); $("mainScroll").scrollTop = 0; }
      });
    });
  }

  /* ========== Record ========== */
  function toggleRecord() {
    var video = $("videoPlayer");
    var btn = $("btnRecord");
    if (!isRecording) {
      try {
        var stream = video.captureStream ? video.captureStream() : (video.mozCaptureStream && video.mozCaptureStream());
        if (!stream) { alert("ضبط روی این دستگاه پشتیبانی نمی‌شود"); return; }
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
        mediaRecorder.ondataavailable = function (e) { if (e.data.size) recordedChunks.push(e.data); };
        mediaRecorder.onstop = function () {
          var blob = new Blob(recordedChunks, { type: "video/webm" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "arshia-tv-" + Date.now() + ".webm";
          a.click();
        };
        mediaRecorder.start(1000);
        isRecording = true;
        btn.classList.add("recording");
      } catch (err) {
        alert("ضبط در دسترس نیست: " + (err.message || err));
      }
    } else {
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      isRecording = false;
      btn.classList.remove("recording");
    }
  }

  /* ========== Share ========== */
  function shareLink() {
    var url = location.href.split("?")[0];
    var data = { title: "ARSHIA TV", text: "پخش زنده ارشیا تی‌وی", url: url };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { alert("لینک کپی شد"); });
    } else {
      prompt("لینک را کپی کنید:", url);
    }
  }

  /* ========== Install ========== */
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstall = e;
  });

  function tryInstall() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function () { deferredInstall = null; });
    } else {
      openModal("modalInstall");
    }
  }

  /* ========== Admin ========== */
  function adminLogin() {
    var p = $("adminPass").value;
    if (p === ADMIN_PASS) {
      $("adminLogin").style.display = "none";
      $("adminPanel").style.display = "block";
      $("adminChCount").textContent = (window.CHANNELS || []).length;
      var s = loadSettings();
      $("adminCard").value = s.card || "";
      $("adminBanner").value = s.banner || "";
      sessionStorage.setItem("arshia_admin", "1");
    } else {
      alert("رمز اشتباه است");
    }
  }

  /* ========== Bind ========== */
  function bind() {
    $("btnMenu").addEventListener("click", openDrawer);
    $("btnCloseDrawer").addEventListener("click", closeDrawer);
    $("drawerOverlay").addEventListener("click", closeDrawer);
    $("btnUser").addEventListener("click", function () { openModal("modalAuth"); });
    $("btnSearch").addEventListener("click", function () { openModal("modalSearch"); $("searchInput").focus(); });
    $("btnEpg").addEventListener("click", function () {
      var p = $("epgPanel");
      p.style.display = p.style.display === "none" ? "block" : "none";
    });
    $("btnFullscreen").addEventListener("click", function () {
      var v = $("videoPlayer");
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });
    $("btnRecord").addEventListener("click", toggleRecord);
    $("btnSub").addEventListener("click", function () { alert("اشتراک رایگان فعال شد ✓"); });
    $("btnArchiveAll").addEventListener("click", function () { openModal("modalArchive"); });

    // FAB
    $("fabMain").addEventListener("click", function () {
      $("fabPanel").classList.toggle("open");
    });
    $("btnDonateNow").addEventListener("click", function () {
      $("fabPanel").classList.remove("open");
      openModal("modalDonate");
    });

    // Drawer actions
    qsa(".drawer-list li").forEach(function (li) {
      li.addEventListener("click", function () {
        var a = li.getAttribute("data-action");
        closeDrawer();
        if (a === "auth") openModal("modalAuth");
        else if (a === "donate") openModal("modalDonate");
        else if (a === "install") tryInstall();
        else if (a === "share") shareLink();
        else if (a === "archive") openModal("modalArchive");
        else if (a === "sub") $("btnSub").click();
        else if (a === "admin") {
          if (sessionStorage.getItem("arshia_admin") === "1") {
            $("adminLogin").style.display = "none";
            $("adminPanel").style.display = "block";
            $("adminChCount").textContent = (window.CHANNELS || []).length;
          }
          openModal("modalAdmin");
        }
        else if (a === "rules") openModal("modalRules");
      });
    });

    // Bottom nav
    qsa(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        qsa(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var page = btn.getAttribute("data-page");
        if (page === "home" || page === "live") {
          $("mainScroll").scrollTop = 0;
          if (page === "live") qs(".channels-section").scrollIntoView({ behavior: "smooth" });
        } else if (page === "archive") openModal("modalArchive");
        else if (page === "search") { openModal("modalSearch"); $("searchInput").focus(); }
        else if (page === "menu") openDrawer();
      });
    });

    // Modal close buttons
    qsa("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function () { closeModal(btn.getAttribute("data-close")); });
    });

    // Auth
    $("btnAuthSave").addEventListener("click", function () {
      var user = $("authUser").value.trim();
      var pass = $("authPass").value;
      var phone = $("authPhone").value.trim();
      if (!user || !pass) { alert("نام کاربری و رمز را وارد کنید"); return; }
      setUser({ username: user, password: pass, phone: phone });
      closeModal("modalAuth");
      alert("ورود با موفقیت ذخیره شد");
    });
    $("btnAuthLogout").addEventListener("click", function () {
      setUser(null);
      $("authUser").value = "";
      $("authPass").value = "";
      $("authPhone").value = "";
      closeModal("modalAuth");
    });

    // Donate copy
    $("btnCopyCard").addEventListener("click", function () {
      var t = $("cardNumber").textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t.replace(/-/g, "")).then(function () { alert("کپی شد"); });
      else prompt("کپی کنید:", t);
    });

    // Search input
    $("searchInput").addEventListener("input", function () { doSearch(this.value); });

    // Install
    $("btnInstallPrompt").addEventListener("click", tryInstall);

    // Admin
    $("btnAdminLogin").addEventListener("click", adminLogin);
    $("btnAdminSave").addEventListener("click", function () {
      saveSettings({ card: $("adminCard").value.trim(), banner: $("adminBanner").value.trim() });
      alert("ذخیره شد");
    });
    $("btnAdminLogout").addEventListener("click", function () {
      sessionStorage.removeItem("arshia_admin");
      $("adminLogin").style.display = "block";
      $("adminPanel").style.display = "none";
      $("adminPass").value = "";
    });
  }

  /* ========== Init ========== */
  document.addEventListener("DOMContentLoaded", function () {
    loadSettings();
    updateUserUI();
    renderTabs();
    renderGrid();
    bind();
    setOverlay("شبکه را انتخاب کنید");
  });
})();
