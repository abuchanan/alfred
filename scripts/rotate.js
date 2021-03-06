define(['domReady', 'ik', 'paper'], function(domReady, ik) {

  domReady(function() {
      paper.setup('canvas');

      var tool = new paper.Tool();

      var items = [];

      // Figure out how to break this into a separate module
      function RotateTool( foo ){
          this.path = foo;

          // this sucks
          this.pt = this.path.center.add([20, 0]);

          this.arc = new paper.Path.Arc( this.pt, this.pt, this.pt );
          this.arc.strokeColor = 'red';
          this.arc.strokeWidth = 1;

          var ia = new paper.Path.Circle(this.path.center, 10);
          ia.strokeColor = 'blue';
          ia.visible = false;
          ia.dashArray = [1, 1];
          this.inner_arc = ia;

          this.ang = 0;

          this.active = false;
      }
      RotateTool.prototype = new paper.Tool();
      // TODO add text to arcs, describing angles
      RotateTool.prototype.drawArc = function() {
          // TODO some bug in arc.  arc can be ahead of path.
          // difficult to reproduce
          var x = this.ang % 360;
          var y = this.pt.rotate(x / 2, this.path.center);
          var z = this.pt.rotate(x, this.path.center);

          this.arc.removeSegments();
          this.arc.moveTo(this.pt);
          this.arc.arcTo(y, z);
          this.arc.strokeColor = 'red';
          this.arc.strokeWidth = 1;
      };
      RotateTool.prototype.drawInnerArc = function() {

          if (Math.abs(this.ang) > 360) {
              this.inner_arc.visible = true;
              var i = Math.floor(Math.abs(this.ang) / 360);
              // TODO bug, negative dashArray value causes crash
              if (i < 7) {
                  this.inner_arc.dashArray = [i, i];
              }
          } else {
              this.inner_arc.visible = false;
          }
      };
      RotateTool.prototype.onMouseDown = function( e ){

          if (this.path.end_circle.hitTest( e.point )){
              this.active = true;
              this.path.select();
          } else {
              this.active = false;
              this.arc.removeSegments();
              this.path.deselect();
          }
          if (this.active) {
              this.drawArc();
              this.drawInnerArc();
          }
      };
      RotateTool.prototype.onMouseDrag = function( e ){

          // this sucks
          if (this.active) {
              this.path.end = e.point;
              this.path.updatePath();

              var a = e.point.subtract(this.path.center);
              var b = e.lastPoint.subtract(this.path.center);
              var c = a.getDirectedAngle(b);
              this.ang += -1 * c;

              // this.sucks()
              this.arc.removeSegments();
              this.drawArc();
              this.drawInnerArc();
          }
      };
      RotateTool.prototype.onMouseUp = function( e ){
      };

      var Foo = function(center, length) {
          this.center = center;
          this.length = length;
          this.end = this.center.add([length, 0]);
             
          this.animPath = new paper.Path();
          // too public
          this.selected = false;

          this.path = new paper.Path([this.center, this.end]);
          this.path.strokeColor = 'black';

          this.center_circle = new paper.Path.Circle( this.center, 2 );
          this.center_circle.fillColor = 'black';

          this.end_circle = new paper.Path.Circle( this.end, 2 );
          this.end_circle.fillColor = 'red';

          this.rotateTool = new RotateTool( this );
      }
      // selection style is pretty ugly
      Foo.prototype = {
          select: function() {
              this.selected = true;
              this.path.selected = true;
              this.end_circle.selected = true;
          },
          deselect: function() {
              this.selected = true;
              this.path.selected = false;
              this.end_circle.selected = false;
          },
          updatePath: function(){
              this.path.firstSegment.point = this.center;
              this.path.lastSegment.point = this.end;

              this.center_circle.position = this.center;
              this.end_circle.position = this.end;
          },
      };

      for (var i = 0; i < 2; i++) {

          var p = paper.view.center.add([50 * i, 0]);
          items.push(new Foo(p, 25));
      }

      tool.onMouseDown = function( e ){

          for( var i = 0; i < items.length; i++ ){
              // this really sucks
              // why does paper.js only allow one event handler?
              // seems contrary to normal JS practice
              items[i].rotateTool.onMouseDown(e);
          }
      };
      tool.onMouseDrag = function( e ){

          for( var i = 0; i < items.length; i++ ){
              // this sucks
              // why does paper.js only allow one event handler?
              // seems contrary to normal JS practice
              items[i].rotateTool.onMouseDrag(e);
          }
      };
      tool.onMouseUp = function( e ){

          for( var i = 0; i < items.length; i++ ){
              // this sucks
              // why does paper.js only allow one event handler?
              // seems contrary to normal JS practice
              items[i].rotateTool.onMouseUp(e);
          }
      };

      var playing = false;
      var animProgress = 0;
      // need a way to have default length, but adjust when out of room
      var animLength = 10;

      // TODO catch errors when playing with empty timeline
      // default to some timeline that doesn't error
      paper.view.onFrame = function() {

          if (playing) {

              for( var i = 0; i < items.length; i++ ){

                  var it = items[i];
                  // need start/stop points for path animations
                  var offset = it.animPath.length * (animProgress / animLength);
                  var pt = it.animPath.getPointAt(offset);
                  var a = it.path.lastSegment.point.subtract(it.path.firstSegment.point);
                  var b = it.path.firstSegment.point.add([10, 0]).subtract(it.path.firstSegment.point);
                  var c = a.getDirectedAngle(b);
                  it.path.rotate(c, it.center);
                  it.path.rotate(pt.x, it.center);
              }

              if (animProgress === animLength) {
                  playing = false;
                  animProgress = 0;
              } else {
                  animProgress += 1;
              }
          }
      }

      // ... sooner or later, need area select, e.g. drag out a selection box
      document.getElementById('add').addEventListener('click', function(){
          for( var i = 0; i < items.length; i++ ){
              if (items[i].selected) {
                  var time = 0;
                  if (items[i].animPath.segments.length > 0) {
                      time = items[i].animPath.lastSegment.point.y;
                      time += 50;
                  }
                  // don't like how ang gets pulled from rotateTool
                  items[i].animPath.add([items[i].rotateTool.ang, time]);
              }
          }
      });

      document.getElementById('play').addEventListener('click', function(){
          playing = true;
      });

      document.getElementById('clear').addEventListener('click', function(){

          for( var i = 0; i < items.length; i++ ){
              items[i].animPath.removeSegments();
          }
      });
  });
});
