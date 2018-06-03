/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2018, OAF2E
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

function OAMarkerClustering (opts) {
  // opts 預設
  if (typeof opts == 'undefined') opts = {};

  // Object 使用的 function
  this.extend = function (obj1, obj2) {
    for (var i in obj2) if (obj2.hasOwnProperty (i)) obj1[i] = obj2[i]; return obj1;
  };
  this.objToArray = function (obj) {
    var arr =[];
    for(var i in obj) if (obj.hasOwnProperty(i)) arr.push (obj[i]);
    return arr;
  };
  
  // 辨別用常數
  this.UNIT_LAT_LNG   = 1;
  this.UNIT_ARRAY     = 2;

  // 設置 options
  this.options = this.extend ({
        maps: null,
        type: 'runAll',
        runAllFilter: true,
        maxZoom: 16,
      }, opts);

  // 物件內用變數
  this.objs = [];
  this.zooms = [];
  this.unit = this.UNIT_LAT_LNG;
  this.markers = [];
  this.lastZoom = -1;

  // 多個 Marker 集合樣式
  this.clusteringMarkerCallback = function () { return null; };

  // 單個 Marker 樣式
  this.markerCallback = function () { return null; };

  // 設置 LatLng 物件陣列
  this.setLatLngs = function (objs) {
    this.objs = objs;
    this.unit = this.UNIT_LAT_LNG;
    this.transform ();
  
    (this.options.type == 'runAll') && this.runAll ();
    (this.options.type == 'moveRun') && this.moveRun ();
    return this;
  };
  // 設置 座標陣列，第一個元素為 lat,第二為 lng
  this.setArrays = function (arrays) {
    this.objs = arrays;
    this.unit = this.UNIT_ARRAY;
    this.transform ();

    (this.options.type == 'runAll') && this.runAll ();
    (this.options.type == 'moveRun') && this.moveRun ();
    return this;
  };
  // 移除計算用 key
  this.freeTransform = function (obj) {
    delete obj._hasChoice;
    delete obj._lat;
    delete obj._lng;
    return this;
  };
  // 設置計算用 key
  this.transform = function () {
    switch (this.unit) {
      default:
      case this.UNIT_LAT_LNG:
        this.transformLatLng = function (obj) {
          obj._hasChoice = false;
          obj._lat = obj.lat ();
          obj._lng = obj.lng ();
          return obj;
        };
        break;
      case this.UNIT_ARRAY:
        this.transformLatLng = function (obj) {
          obj._hasChoice = false;
          obj._lat = obj[0];
          obj._lng = obj[1];
          return obj;
        };
        break;
    }
    return this;
  };
  // 設置 多個 Marker 集合樣式
  this.setClusteringMarker = function (clusteringMarkerCallback) {
    this.clusteringMarkerCallback = clusteringMarkerCallback;
    return this;
  };
  // 設置 單個 Marker 樣式
  this.setMarker = function (markerCallback) {
    this.markerCallback = markerCallback;
    return this;
  };
  // type 為 moveRun 的處理函式
  this.moveRun = function () {
    if (!this.options.maps) return console.error ('OAMarkerClustering - 尚未設置 maps！');

    this.options.maps.addListener ('idle', function () {
      var bounds = this.options.maps.getBounds (),
          northEast = bounds.getNorthEast (),
          southWest = bounds.getSouthWest (),
          sa = southWest.lat (),
          na = northEast.lat (),
          sn = southWest.lng (),
          nn = southWest.lng () > northEast.lng () ? 180 + Math.abs (northEast.lng ()) : northEast.lng (),
          zoom = this.options.maps.zoom,
          zooms = {};

      // 過濾出 maps 上範圍內的座標點
      var objs = this.objs.map (this.transformLatLng).filter (function (t) {
          return t._lat >= sa && t._lat <= na && t._lng >= sn && t._lng <= nn;
        }.bind (this));

      // zoom 大於最大限制，顯示全部
      if (zoom >= this.options.maxZoom) {
        this.markers.forEach (function (t) { t.setMap (null); });
        this.markers = this.objs.map (function (t) { return this.markerCallback (t); }.bind (this)).filter (function (t) { return t; });
        return ;
      }

    
      // 取得目前此層的集合資訊
      // _hasChoice 代表是否有被納入集合點過
      for (var i = 0, c = objs.length; i < c; i++) {
        if (objs[i]._hasChoice) continue;

        zooms[i] = {point: objs[i], count: 1};
        objs[i]._hasChoice = true;

        for (var j = 0; j < c; j++) {
          if (objs[j]._hasChoice) continue;

          // 當範圍內時，集合點數量 +1
          var d = Math.max (Math.abs (objs[i]._lat - objs[j]._lat), Math.abs (objs[i]._lng - objs[j]._lng));
          
          // 點之間距離判斷的關鍵
          if (30 / Math.pow (2, zoom) > d) {
            zooms[i].count += 1;
            objs[j]._hasChoice = true;
          }
        }
      }

      // 移除舊的集合點，加入新的
      objs.forEach (this.freeTransform);
      this.markers.forEach (function (t) { t.setMap (null); });
      this.markers = this.objToArray (zooms).map (function (t) { return t.count == 1 ? this.markerCallback (t.point) : this.clusteringMarkerCallback (t.point, t.count); }.bind (this)).filter (function (t) { return t instanceof google.maps.Marker; });
    }.bind (this));

    return this;
  };

  // type 為 runAll 的處理函式
  this.runAll = function () {
    if (!this.options.maps) return console.error ('OAMarkerClustering - 尚未設置 maps！');

    // 轉換設定需要的 key 用以運算
    this.objs.forEach (this.transformLatLng);

    // 逐層的針對不同大小的 zoom 做設定，收集各 zoom 集合資訊
    // _hasChoice 代表是否有被納入集合點過
    for (var l = 0, c = this.objs.length; l < this.options.maxZoom; l++) {
      this.zooms[l] = {};

      for (var i = 0; i < c; i++) {
        if (this.objs[i]._hasChoice) continue;
        
        this.zooms[l][i] = {point: this.objs[i], count: 1};
        this.objs[i]._hasChoice = true;

        for (var j = 0; j < c; j++) {
          if (this.objs[j]._hasChoice) continue;

          // 當範圍內時，集合點數量 +1
          var d = Math.max (Math.abs (this.objs[i]._lat - this.objs[j]._lat), Math.abs (this.objs[i]._lng - this.objs[j]._lng));
          
          // 點之間距離判斷的關鍵
          if (30 / Math.pow (2, l) > d) {
            this.zooms[l][i].count += 1;
            this.objs[j]._hasChoice = true;
          }
        }
      }

      // 為下一層 zoom 歸零
      this.objs.forEach (function (t) { t._hasChoice = false; });
    }
    
    this.objs.forEach (this.freeTransform);
    this.zooms = this.zooms.map (this.objToArray);
    this.options.maps.addListener ('idle', function () {
      var zoom = this.options.maps.zoom;

      // 當地圖指示左右滑動，而尚未變更 zoom 時，則不需要移除重上
      if (this.lastZoom == zoom) return;
      else this.lastZoom = zoom;

      // 移除舊的點，新增新點
      this.markers.forEach (function (t) { t.setMap (null); });
      this.markers = typeof this.zooms[zoom] == 'undefined' ? this.objs.map (function (t) { return this.markerCallback (t); }.bind (this)).filter (function (t) { return t; }) : this.zooms[zoom].map (function (t) { return t.count == 1 ? this.markerCallback (t.point) : this.clusteringMarkerCallback (t.point, t.count); }.bind (this)).filter (function (t) { return t instanceof google.maps.Marker; });
    }.bind (this));
    
    return this;
  };
}
