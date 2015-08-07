
// Meters per second
var SPEED_OF_SOUND = 332;

// 16km
var THUNDER_MAX_DISTANCE = 16 * 1000;

var START_OPACITY = 0.35;

var MP3_NUM = 3;

var SOUNDS = [
  { distance: 1,  offset:  .674 },
  { distance: 2,  offset:  .096 },
  { distance: 3,  offset:  .718 },
  { distance: 4,  offset: 1.451 },
  { distance: 6,  offset: 1.243 },
  { distance: 7,  offset: 3     },
  { distance: 8,  offset:  .873 },
  { distance: 10, offset:  .942 },
  { distance: 11, offset:  .612 },
  { distance: 12, offset: 4.521 },
  { distance: 14, offset: 1.816 },
  { distance: 16, offset: 1.044 }
];

function onAnimationEnd(el, fn) {
  el.addEventListener('animationend', fn);
  el.addEventListener('webkitAnimationEnd', fn);
}

function onTransitionEnd(el, fn) {
  el.addEventListener('transitionend', fn);
  el.addEventListener('webkitTransitionEnd', fn);
}

function startRain() {
  var a = new Audio();
  a.src = 'sounds/rain/4.mp3';
  a.loop = true;
  a.play();
}

function initialize() {

  var idle = true;
  var strikes = [];
  var sounds = [];
  var el = document.getElementById('map-canvas');
  var map = new google.maps.Map(el, mapOptions);
  google.maps.event.addListener(map, 'click', function(evt) {
    lightningStrike(evt.latLng);
  });
  google.maps.event.addListener(map, 'touchstart', function(evt) {
    lightningStrike(evt.latLng);
  });

  function SoundManager() {
    this.elements = [];
    this.preload();
  }

  SoundManager.prototype.preload = function () {
    for (var i = 0; i < SOUNDS.length; i++) {
      var s = SOUNDS[i];
      this.elements.push(this.getNewAudioForSound(s));
    }
  }

  SoundManager.prototype.getNewAudioForSound = function (s) {
      var a = new Audio();
      a.src = 'sounds/thunder/' + s.distance + 'km.mp3';
      a.distance = s.distance;
      a.offset = s.offset;
      a.load();
      return a;
  }

  SoundManager.prototype.getSoundForDistance = function (meters) {
    var km = Math.floor(meters / 1000);
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var a = this.elements[i];
      if (a.distance <= km) {
        return this.select(i);
      }
    }
    return this.select(0);
  }

  SoundManager.prototype.select = function (index) {
    var audio = this.elements[index];
    this.elements[index] = this.getNewAudioForSound(SOUNDS[index]);
    return audio;
  }

  function lightningStrike(latLng) {
    var strike = new google.maps.Circle(getStrikeOptions());
    strike.setCenter(latLng);
    strike.time = new Date();
    strikes.push(strike);
    strike.overlay = new TextOverlay(new google.maps.Circle({center: latLng, radius: 0 }).getBounds(), map, 'strike-info');
    //flash();
    if (idle) {
      frame();
    }
  }

  function flash() {
    flashEl.classList.remove('hit');
    setTimeout(function() {
      flashEl.classList.add('hit');
    }, 16);
  }

  function frame() {
    idle = true;
    for (var i = 0; i < strikes.length; i++) {
      var s = strikes[i];
      updateStrike(s);
      if (!s.finished) {
        idle = false;
      }
    }
    if (!idle) {
      requestAnimationFrame(frame);
    }
  }

  function updateStrike(strike) {
    strike.distance = google.maps.geometry.spherical.computeDistanceBetween(pos.getPosition(), strike.getCenter());
    strike.sound = soundManager.getSoundForDistance(strike.distance);
    strike.distanceWithOffset = strike.distance - strike.sound.offset * SPEED_OF_SOUND;
    var r = ((new Date() - strike.time) / 1000) * SPEED_OF_SOUND;
    if (!strike.hit && r >= strike.distanceWithOffset) {
      strike.hit = true;
      strike.sound.play();
      strike.overlay.addClass('hide');
    }
    if (r > THUNDER_MAX_DISTANCE) {
      strike.finished = true;
      strike.setMap(null);
      strike.overlay.setMap(null);
      return;
    }
    strike.overlay.setDistance(Math.max(0, strike.distance - r));
    strike.setRadius(r);
    strike.setOptions({
      fillColor: getColor(r, strike.distance),
      fillOpacity: getOpacity(r)
    });
  }


  function lerp(a, b, u) {
    return (1 - u) * a + u * b;
  }

  function ilerp(a, b, val) {
    return (val - a) / (b - a);
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function getColor(r, d) {
    var g = lerp(0, .8, clamp(Math.abs((d - r) / d), 0, .8));
    return '#' + getColorComponent(1) + getColorComponent(g) + getColorComponent(0);
  }

  function getColorComponent(n) {
    var c = Math.floor(clamp(n, 0, 1) * 255).toString(16);
    if (c.length === 1) {
      c = '0' + c;
    }
    return c;
  }

  function getOpacity(r) {
    return START_OPACITY - START_OPACITY * (r / THUNDER_MAX_DISTANCE)
  }

  function getRandomColor() {
    return '#' + getRandomColorComponent() + getRandomColorComponent() + getRandomColorComponent();
  }

  function getRandomColorComponent() {
    return Math.floor(Math.random() * 256).toString(16);
  }

  function getStrikeOptions() {
    return {
      clickable: false,
      strokeWeight: 0,
      fillColor: '#ff8822',
      fillOpacity: 0.35,
      map: map,
      center: mapOptions.center,
      radius: 0,
    };
  }

  var pos = new google.maps.Marker({
    draggable: true,
    map: map,
    position: mapOptions.center
  });
  f = pos;

  flashEl = document.getElementById('flash');
  onAnimationEnd(flashEl, function() {
    flashEl.classList.remove('hit');
  });

  var soundManager = new SoundManager();
  startRain();
  document.body.classList.add('loaded');
}


function TextOverlay(bounds, map, className, text) {

  // Now initialize all properties.
  this.bounds_ = bounds;
  //this.image_ = image;
  this.map_ = map;
  this.className_ = className;
  this.text_ = text || '';

  // Define a property to hold the image's div. We'll
  // actually create this div upon receipt of the onAdd()
  // method so we'll leave it null for now.
  this.div_ = null;

  // Explicitly call setMap on this overlay
  this.setMap(map);
}

TextOverlay.prototype = new google.maps.OverlayView();

TextOverlay.prototype.setDistance = function(m) {
  if (this.div_) {
    var t = (m / 1000).toFixed(2) + 'km';
    var min = 10;
    this.div_.title = t
    this.div_.innerHTML = t;
    var fontSize = Math.round((2000 / Math.max(0.0000001, m) * 5) + min);
    this.div_.style.margin = -fontSize + 'px' + ' 0 0 ' + -fontSize + 'px';
    this.div_.style.fontSize = fontSize + 'px';
  }
}

TextOverlay.prototype.addClass = function(c) {
  this.div_.classList.add(c);
}

/**
 * onAdd is called when the map's panes are ready and the overlay has been
 * added to the map.
 */
TextOverlay.prototype.onAdd = function() {

  var div = document.createElement('div');
  div.className = this.className_ + ' marker';
  div.innerHTML = this.text_;
  div.title = this.text_;

  onTransitionEnd(div, this.transitionEnd.bind(this));

  this.div_ = div;

  // Add the element to the "overlayImage" pane.
  var panes = this.getPanes();
  panes.overlayImage.appendChild(this.div_);
};

TextOverlay.prototype.transitionEnd = function() {
  this.setMap(null);
}

TextOverlay.prototype.draw = function() {

  // We use the south-west and north-east
  // coordinates of the overlay to peg it to the correct position and size.
  // To do this, we need to retrieve the projection from the overlay.
  var overlayProjection = this.getProjection();

  // Retrieve the south-west and north-east coordinates of this overlay
  // in LatLngs and convert them to pixel coordinates.
  // We'll use these coordinates to resize the div.
  var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
  var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

  // Resize the image's div to fit the indicated dimensions.
  var div = this.div_;
  div.style.left = sw.x + 'px';
  div.style.top = ne.y + 'px';
  div.style.width = (ne.x - sw.x) + 'px';
  div.style.height = (sw.y - ne.y) + 'px';
};

TextOverlay.prototype.onRemove = function() {
  this.div_.parentNode.removeChild(this.div_);
};

// Set the visibility to 'hidden' or 'visible'.
TextOverlay.prototype.hide = function() {
  if (this.div_) {
    // The visibility property must be a string enclosed in quotes.
    this.div_.style.visibility = 'hidden';
  }
};

TextOverlay.prototype.show = function() {
  if (this.div_) {
    this.div_.style.visibility = 'visible';
  }
};

TextOverlay.prototype.toggle = function() {
  if (this.div_) {
    if (this.div_.style.visibility == 'hidden') {
      this.show();
    } else {
      this.hide();
    }
  }
};

// Detach the map from the DOM via toggleDOM().
// Note that if we later reattach the map, it will be visible again,
// because the containing <div> is recreated in the overlay's onAdd() method.
TextOverlay.prototype.toggleDOM = function() {
  if (this.getMap()) {
    // Note: setMap(null) calls OverlayView.onRemove()
    this.setMap(null);
  } else {
    this.setMap(this.map_);
  }
};

var mapOptions = {
  scaleControl: true,
  disableDoubleClickZoom: true,
  zoom: 14,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [
        { visibility: "off" }
      ]
    }
  ]
};

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (position) {
    mapOptions.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    initialize();
  });
} else {
  mapOptions.center = new google.maps.LatLng(52.3929782, 0.2754109);
  google.maps.event.addDomListener(window, 'load', initialize);
}

