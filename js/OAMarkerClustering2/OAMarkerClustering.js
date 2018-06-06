/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2018, OAF2E
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

var OAMarkerClustering = function (opts) {
  this.uses = [];
  this.tmp = [];

  this.opts = Object.assign ({
    map: null,
    unit: 3,
    useLine: false,
    middle: true,

    latKey: 'a',
    lngKey: 'n',
    varKey: null,
    markersKey: null,
  }, opts);
};

Object.assign (
  OAMarkerClustering.prototype, {
    clean: function () {
      this.uses = [];
      this.tmp = [];
    },
    markers: function (arr) {
      if (!this.opts.map)
        return [];

      var that = this,
          z = this.opts.map.zoom,
          i = arr.length - 1,
          j = arr.length - 1,
          c = arr.length;

      that.clean ();

      for (; i >= 0; i--) {
        if (that.uses[i])
          continue;

        that.tmp[i] = {
          m: [arr[i]],
          a: arr[i][that.opts.latKey],
          n: arr[i][that.opts.lngKey],
        };
        that.uses[i] = true;

        for (j = i - 1; j >= 0; j--) {
          if (that.uses[j])
            continue;

          if ((30 / Math.pow (2, z)) / that.opts.unit <= Math.max (Math.abs (arr[i][that.opts.latKey] - arr[j][that.opts.latKey]), Math.abs (arr[i][that.opts.lngKey] - arr[j][that.opts.lngKey])))
            if (that.opts.useLine)
              break;
            else
              continue;

          that.uses[j] = true;
          that.tmp[i].m.push (arr[j]);
        }
      }


      var ms = [];

      that.tmp.forEach (function (t, i) {

        var tmp = that.opts.middle ?
          new google.maps.LatLng (t.m.map (function (u) { return u[that.opts.latKey]; }).reduce (function (a, b) { return a + b; }) / t.m.length, t.m.map (function (u) { return u[that.opts.lngKey]; }).reduce (function (a, b) { return a + b; }) / t.m.length) :
          new google.maps.LatLng (t.a, t.n);

        if (that.opts.markersKey !== null)
          tmp[that.opts.markersKey] = t;

        if (that.opts.varKey !== null)
          tmp[that.opts.varKey] = arr[i];

        ms.push (tmp);
      });

      that.clean ();

      return ms;
    }
  }
);
