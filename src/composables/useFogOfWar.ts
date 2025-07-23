// @ts-nocheck

L.FogLayer = (L.Layer ? L.Layer : L.Class).extend({
  initialize: function (latlngs, options) {
    this._latlngs = latlngs
    L.setOptions(this, options)
  },

  setLatLngs: function (latlngs) {
    this._latlngs = latlngs
    return this.redraw()
  },

  addLatLng: function (latlng) {
    this._currentlatlng = latlng
    this._latlngs.push({
      latlng,
      heading: this._heading ?? 0, // ou une valeur par défaut
    })
    return this._redraw()
  },

  addCurrentLatLng: function (latlng) {
    if (!this._currentlatlng || !this._currentlatlng.equals(latlng)) {
      this._currentlatlng = latlng
      return this._redraw()
    }
  },

  redraw: function () {
    if (this._fog && !this._frame && !this._map._animating) {
      this._frame = L.Util.requestAnimFrame(this._redraw, this)
    }
    return this
  },

  addTo: function (map) {
    map.addLayer(this)
    return this
  },
  onAdd: function (map) {
    this._map = map

    if (!this._canvas) {
      this._initCanvas()
    }

    map._panes.overlayPane.appendChild(this._canvas)

    map.on('moveend', this._reset, this)

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on('zoomanim', this._animateZoom, this)
    }

    this._reset()
  },
  onRemove: function (map) {
    map.getPanes().overlayPane.removeChild(this._canvas)
    map.off('moveend', this._reset, this)
    if (map.options.zoomAnimation) {
      map.off('zoomanim', this._animateZoom, this)
    }
  },

  setHeading: function (headingDeg) {
    const newHeading = (360 - headingDeg) % 360

    if (
      this._heading == null ||
      Math.abs(this._heading - newHeading) > 1 // n'ajoute que si l'angle a changé de plus de 1°
    ) {
      this._heading = newHeading

      if (this._currentlatlng) {
        this._latlngs.push({
          latlng: this._currentlatlng,
          heading: this._heading,
        })
      }

      return this._redraw()
    }

    return null
  },

  _initCanvas: function () {
    const canvas = (this._canvas = L.DomUtil.create('canvas', 'leaflet-fog-layer leaflet-layer'))

    const originProp = L.DomUtil.testProp([
      'transformOrigin',
      'WebkitTransformOrigin',
      'msTransformOrigin',
    ])
    canvas.style[originProp] = '50% 50%'

    const size = this._map.getSize()
    canvas.width = size.x
    canvas.height = size.y

    const animated = this._map.options.zoomAnimation && L.Browser.any3d
    L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'))
  },

  _reset: function () {
    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this._canvas, topLeft)
    this._redraw()
  },

  _redraw: function () {
    const ctx = this._canvas.getContext('2d')
    const size = this._map.getSize()
    const radiusInMeters = 20
    const blurFactor = 0.5 // 0.5 = 50% du rayon en flou

    const latlng0 = this._map.getCenter()
    const latlng1 = L.latLng(latlng0.lat, latlng0.lng + 0.001)
    const p0 = this._map.latLngToContainerPoint(latlng0)
    const p1 = this._map.latLngToContainerPoint(latlng1)
    const metersPerPixel = latlng0.distanceTo(latlng1) / Math.abs(p0.x - p1.x)
    const radius = radiusInMeters / metersPerPixel
    const blur = radius * blurFactor

    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)

    // Dessine le brouillard noir
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(0, 0, size.x, size.y)

    // Passe en mode "effacer"
    ctx.globalCompositeOperation = 'destination-out'

    const drawGradientCone = (latlng, headingDeg, radiusInMeters = 10) => {
      latlng = L.latLng(latlng) // convertit si nécessaire

      const p = this._map.latLngToContainerPoint(latlng)
      const latlng1 = L.latLng(latlng.lat, latlng.lng + 0.001)
      const p1 = this._map.latLngToContainerPoint(latlng1)

      const metersPerPixel = latlng.distanceTo(latlng1) / Math.abs(p.x - p1.x)
      const radius = radiusInMeters / metersPerPixel
      const blur = radius * 0.05
      const spread = Math.PI / 1.5

      const angle = ((headingDeg - 90) * Math.PI) / 180
      const startAngle = angle - spread / 2
      const endAngle = angle + spread / 2

      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.3, p.x, p.y, radius + blur)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.arc(p.x, p.y, radius + blur, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()
    }

    // Les anciens points révélés
    for (let i = 0; i < this._latlngs.length; i++) {
      const { latlng, heading } = this._latlngs[i]
      drawGradientCone.call(this, latlng, heading, radiusInMeters)
    }

    // Le point courant
    if (this._currentlatlng && this._heading !== undefined) {
      drawGradientCone.call(this, this._currentlatlng, this._heading, radiusInMeters)
    }

    // Revenir au mode normal
    ctx.globalCompositeOperation = 'source-over'
  },

  _animateZoom: function (e) {
    const scale = this._map.getZoomScale(e.zoom)

    const offset = this._map
      ._getCenterOffset(e.center)
      ._multiplyBy(-scale)
      .subtract(this._map._getMapPanePos())

    if (L.DomUtil.setTransform) {
      L.DomUtil.setTransform(this._canvas, offset, scale)
    } else {
      this._canvas.style[L.DomUtil.TRANSFORM] =
        L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')'
    }
  },
})

L.fogLayer = function (latlngs, options) {
  return new L.FogLayer(latlngs, options)
}
