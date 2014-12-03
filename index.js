paper.install(window);

window.onload = function() {
  paper.setup('myCanvas');
  // Create a simple drawing tool:
  var tool = new Tool();
  var edge;
  var edges = [];
  var vertex;
  var vertexes = {};
  var MODE = {
    DRAWING: 0,
    EDITING: 1,
    LABELING: 2
  };
  var mode = MODE.DRAWING;

  var currentPath;
  var currentSegment;

  var RADIUS_THRESHOLD = 10;
  var LINE_LENGTH_THRESHOLD = 30;
  var ANGLE_BACKLASH_THRESHOLD = 6;

  var hitOptions = {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5
  };

  var i,j,k,l,m,n;

  $d = $("#debug");

  function beautify(){
    vertexes = [];
    for(i=0; i<edges.length; i++){
      for(j=0; j<edges.length; j++){
        if(i==j) continue;
        for(k=0; k<2; k++){
          for(l=0; l<2; l++){
            if(edges[i].segments[k].point == edges[j].segments[l].point) continue;
            var dist = edges[i].segments[k].point.getDistance(edges[j].segments[l].point);
            // console.log(edges[i].segments[k].point);
            // console.log(edges[j].segments[l].point);
            // console.log(dist);
            if(dist < RADIUS_THRESHOLD){
              edges[i].segments[k].point = edges[j].segments[l].point;
            }
          }
        }
      }
    }
  }

  function clean(){
    var edgesIndexToDelete = [];
    for(i=0; i<edges.length; i++){
      if(edges[i].length < LINE_LENGTH_THRESHOLD){
        console.log(i);
        var offsetIndex = i-edgesIndexToDelete.length;
        edgesIndexToDelete.push(offsetIndex);
      }
    }
    // console.log(edgesIndexToDelete);
    for(i=0; i<edgesIndexToDelete.length; i++){
      var edgeToDelete = edges[edgesIndexToDelete[i]];
      edges.splice(edgesIndexToDelete[i], 1);
      edgeToDelete.remove();
    }
    $d.text(edges);
  }

  tool.onMouseDown = function(event) {
    switch(mode){
      case MODE.DRAWING:
        edge = new Path();
        edge.strokeColor = 'black';
        edge.strokeWidth = 2;
        edge.add(event.point);
        edge.add(event.point);
        break;
      case MODE.EDITING:
        currentSegment = currentPath = null;
        var hitResult = project.hitTest(event.point, hitOptions);
        if (!hitResult)
          return;
        if (event.modifiers.shift) {
          // if (hitResult.type == 'segment') {
            // hitResult.segment.remove();
          // }
          if( hitResult.type == 'stroke' ){
            for(i=0; i<edges.length; i++){
              if(edges[i] === hitResult.item){
                edges.splice(i,1);
              }
            }
            hitResult.item.remove();
          }
          return;
        }
        // console.log(hitResult);
        if (hitResult) {
          currentPath = hitResult.item;
          if (hitResult.type == 'segment') {
            currentSegment = hitResult.segment;
          } else if (hitResult.type == 'stroke') {
            // project.activeLayer.addChild(hitResult.item);
          }
        }
        break;
      case MODE.LABELING:
        break;
    }
  };

  tool.onMouseMove = function(event) {
    switch(mode){
      case MODE.DRAWING:
        break;
      case MODE.EDITING:
        project.activeLayer.selected = false;
        if(event.item){
          event.item.selected = true;
        }
        break;
      case MODE.LABELING:
        break;
    }
  };

  tool.onMouseDrag = function(event){
    switch(mode){
      case MODE.DRAWING:
        edge.segments[1].point = event.point;
        var intersections = [];
        for(i=0; i<edges.length; i++){
          var its = edge.getIntersections(edges[i]);
          if(its.length){
            intersections = intersections.concat(its);
          }
        }
        if(intersections.length===0) return;
        var closestIntersection = intersections[0];
        var minDist = edge.segments[0].point.getDistance(closestIntersection.point);
        for(i=1; i<intersections.length; i++){
          var dist = edge.segments[0].point.getDistance(intersections[i].point);
          if(dist < minDist){
            minDist = dist;
            closestIntersection = intersections[i];
          }
        }
        edge.segments[1].point = closestIntersection.point;
        break;
      case MODE.EDITING:
        if (currentSegment) {
          currentSegment.point = event.point;
          var anotherSegment;
          for(i=0; i<2; i++){
            if(currentPath.segments[i].point.equals(currentSegment.point)){
                continue;
              }else{
                anotherSegment = currentPath.segments[i];
              }
          }
          var intersections = [];
          for(i=0; i<edges.length; i++){
            if(currentPath === edges[i]) continue;
            var its = edge.getIntersections(edges[i]);
            if(its.length){
              intersections = intersections.concat(its);
            }
          }
          if(intersections.length===0) return;
          var closestIntersection = intersections[0];
          var minDist = anotherSegment.point.getDistance(closestIntersection.point);
          for(i=1; i<intersections.length; i++){
            var dist = anotherSegment.point.getDistance(intersections[i].point);
            if(dist < minDist){
              minDist = dist;
              closestIntersection = intersections[i];
            }
          }
          if(closestIntersection.point == anotherSegment.point) return;
          currentSegment.point = closestIntersection.point;
        }
        break;
      case MODE.LABELING:
        break;
    }
  };

  tool.onMouseUp = function(event){
    var angle,
        edgesIndexToDelete,
        edgeToDelete,
        offsetIndex,
        e1, e2,
        v1, v2;
    switch(mode){
      case MODE.DRAWING:
        edges.push(edge);
        clean();
        beautify();
        if(edge){
          edgesIndexToDelete = [];
          for(i=0; i < edges.length-1; i++){
            for(j=0; j<2; j++){
              v1 = new Point(0,0);
              v2 = new Point(0,0);
              v1.x = edges[i].segments[0].point.x - edge.segments[j].point.x;
              v1.y = edges[i].segments[0].point.y - edge.segments[j].point.y;
              v2.x = edges[i].segments[1].point.x - edge.segments[j].point.x;
              v2.y = edges[i].segments[1].point.y - edge.segments[j].point.y;
              angle = v1.getAngle(v2);
              if(Math.abs(180-angle)<ANGLE_BACKLASH_THRESHOLD){
                offsetIndex = i - edgesIndexToDelete.length;
                edgesIndexToDelete.push(offsetIndex);
                e1 = new Path.Line(edges[i].segments[0].point, edge.segments[j].point);
                e2 = new Path.Line(edges[i].segments[1].point, edge.segments[j].point);
                e1.strokeColor = 'black'; e1.strokeWidth = 2;
                e2.strokeColor = 'black'; e2.strokeWidth = 2;
                edges.push(e1);
                edges.push(e2);
              }
            }
          }
          for(i=0; i<edgesIndexToDelete.length; i++){
            edgeToDelete = edges[edgesIndexToDelete[i]];
            edges.splice(edgesIndexToDelete[i], 1);
            edgeToDelete.remove();
          }
        }
        break;
      case MODE.EDITING:
        clean();
        beautify();
        if(currentPath){
          edgesIndexToDelete = [];
          for(i=0; i < edges.length-1; i++){
            for(j=0; j<2; j++){
              v1 = new Point(0,0);
              v2 = new Point(0,0);
              v1.x = edges[i].segments[0].point.x - currentPath.segments[j].point.x;
              v1.y = edges[i].segments[0].point.y - currentPath.segments[j].point.y;
              v2.x = edges[i].segments[1].point.x - currentPath.segments[j].point.x;
              v2.y = edges[i].segments[1].point.y - currentPath.segments[j].point.y;
              angle = v1.getAngle(v2);
              if(Math.abs(180-angle)<ANGLE_BACKLASH_THRESHOLD){
                offsetIndex = i - edgesIndexToDelete.length;
                edgesIndexToDelete.push(offsetIndex);
                e1 = new Path.Line(edges[i].segments[0].point, currentPath.segments[j].point);
                e2 = new Path.Line(edges[i].segments[1].point, currentPath.segments[j].point);
                e1.strokeColor = 'black'; e1.strokeWidth = 2;
                e2.strokeColor = 'black'; e2.strokeWidth = 2;
                edges.push(e1);
                edges.push(e2);
              }
            }
          }
          for(i=0; i<edgesIndexToDelete.length; i++){
            edgeToDelete = edges[edgesIndexToDelete[i]];
            edges.splice(edgesIndexToDelete[i], 1);
            edgeToDelete.remove();
          }
        }
        break;
      case MODE.LABELING:
        break;
    }
    $d.text(edges);
  };
  var last;

  function printVertexType(key){
    if(!vertexes.hasOwnProperty(key)) return;
    vertexes[key].vText = new PointText(vertexes[key].position);
    vertexes[key].vText.position.y += 5;
    vertexes[key].vText.justification = 'center';
    vertexes[key].vText.fillColor = 'white';
    vertexes[key].vText.content = vertexes[key].vType;
  }

  function anotherPoint(edgeIndex, point){
    for(i=0; i<2; i++){
      if(edges[edgeIndex].segments[i].point.equals(point)) continue;
      return edges[edgeIndex].segments[i].point;
    }
  }

  function next_index(indexMax, index){
    if(index>=indexMax-1) return 0;
    else return index+1;
  };


  tool.onKeyDown = function(event){
    switch(event.key){
      case 'd':
        Object.keys(vertexes).forEach(function(key){
          if(vertexes[key].vText){
            vertexes[key].vText.remove();
          }
          vertexes[key].remove();
          delete vertexes[key];
        });
        mode = MODE.DRAWING;
        break;
      case 'e':
        Object.keys(vertexes).forEach(function(key){
          if(vertexes[key].vText){
            vertexes[key].vText.remove();
          }
          vertexes[key].remove();
          delete vertexes[key];
        });
        mode = MODE.EDITING;
        break;
      case 'l':
        mode = MODE.LABELING;
        break;
    }
    switch(mode){
      case MODE.DRAWING:
        switch(event.key){
          case 'c':
            if(edges.length === 0){
              $d.text('no path to delete');
              return;
            }
            console.log('cleared');
            while(edges.length > 0){
              last = edges.pop();
              last.remove();
            }
            $d.text('cleared');
            break;
          case 'u':
            if(edges.length === 0){
              $d.text('no path to delete');
              return;
            }
            last = edges[edges.length-1];
            $d.text('deleted ' + last);
            console.log('deleted ' + last);
            last.remove();
            edges.pop();
            break;
        }
        break;
      case MODE.EDITING:
        switch(event.key){
          case 'c':
            if(edges.length === 0){
              $d.text('no path to delete');
              return;
            }
            console.log('cleared');
            while(edges.length > 0){
              last = edges.pop();
              last.remove();
            }
            $d.text('cleared');
            break;
        }
        break;
      case MODE.LABELING:
        switch(event.key){
          case 'space':
            Object.keys(vertexes).forEach(function(key){
              if(vertexes[key].vText){
                vertexes[key].vText.remove();
              }
              vertexes[key].remove();
              delete vertexes[key];
            });
            for(i=0; i<edges.length; i++){
              for(j=0; j<2; j++){
                for(l=0; l<edges.length; l++){
                  for(m=0; m<2; m++){
                    if(i===l) continue;
                    if(edges[i].segments[j].point.equals(edges[l].segments[m].point)){
                      if(!vertexes.hasOwnProperty(""+edges[i].segments[j].point)){
                        vertexes[""+edges[i].segments[j].point] = new Path.Circle(edges[i].segments[j].point, 10);
                        vertexes[""+edges[i].segments[j].point].fillColor = new Color(1, 0, 0.5, 0.6);
                        vertexes[""+edges[i].segments[j].point].edgesIndex = new Set();
                      }
                      vertexes[""+edges[i].segments[j].point].edgesIndex.add(i);
                      vertexes[""+edges[i].segments[j].point].edgesIndex.add(l);
                    }
                  }
                }
              }
            }
            Object.keys(vertexes).forEach(function(key){
              if(vertexes[key].edgesIndex.size > 3){
                $d.text("wrong junctioning");
              }
              if(vertexes[key].edgesIndex.size == 2){
                vertexes[key].vType = 'L';
                printVertexType(key);
              } else if(vertexes[key].edgesIndex.size == 3){
                var maxAngle = 0;
                var o = vertexes[key].position;
                var vs = [];
                vertexes[key].edgesIndex.forEach(function(edgeIndex){
                  var p = new Point;
                  for(i=0; i<2; i++){
                    if(edges[edgeIndex].segments[i].point.equals(vertexes[key].position)){
                      continue;
                    }
                    p.x = edges[edgeIndex].segments[i].point.x - o.x;
                    p.y = edges[edgeIndex].segments[i].point.y - o.y;
                    vs.push(p);
                  }
                });
                var angle;
                for(i=0; i<2; i++){
                  angle = vs[i].getAngle(vs[i+1]);
                  if(angle > maxAngle){
                    maxAngle = angle;
                  }
                }
                if(Math.abs(180-maxAngle) < ANGLE_BACKLASH_THRESHOLD){
                  vertexes[key].vType = 'T';
                  printVertexType(key);
                  return;
                }
                var pnum=0, nnum=0;
                for(i=0; i<3; i++){
                  var tv1 = vs[next_index(3, i)].add(vs[i].negate());
                  var tv2 = vs[i].negate();
                  angle = tv1.getDirectedAngle(tv2);
                  if(angle > 0) pnum++;
                  else nnum++;
                }
                if(pnum === 0 || nnum === 0){
                  vertexes[key].vType = 'Y';
                  printVertexType(key);
                }else {
                  vertexes[key].vType = 'A';
                  printVertexType(key);
                }
              }
              //sort vertexes
              if(vertexes[key].vType=='L'){
                var o = vertexes[key].position;
                var vs = [];
                vertexes[key].edgesIndex.forEach(function(edgeIndex){
                  var p = new Point;
                  for(i=0; i<2; i++){
                    if(edges[edgeIndex].segments[i].point.equals(vertexes[key].position)){
                      continue;
                    }
                    p.x = edges[edgeIndex].segments[i].point.x - o.x;
                    p.y = edges[edgeIndex].segments[i].point.y - o.y;
                    vs.push([p, edgeIndex]);
                  }
                });
                var angle = vs[0][0].getDirectedAngle(vs[1][0]);
                if(angle<0){
                  vertexes[key].connection = [""+anotherPoint(vs[0][1], o), ""+anotherPoint(vs[1][1], o)];
                }else{
                  vertexes[key].connection = [""+anotherPoint(vs[1][1], o), ""+anotherPoint(vs[0][1], o)];
                }
              }else if(vertexes[key].vType=='A'){
                var o = vertexes[key].position;
                var vs = [];
                vertexes[key].edgesIndex.forEach(function(edgeIndex){
                  var p = new Point;
                  for(i=0; i<2; i++){
                    if(edges[edgeIndex].segments[i].point.equals(vertexes[key].position)){
                      continue; }
                    p.x = edges[edgeIndex].segments[i].point.x - o.x;
                    p.y = edges[edgeIndex].segments[i].point.y - o.y;
                    vs.push([p, edgeIndex]);
                  }
                });
                var angle;
                var maxAngle=0;
                var maxAnglePair;
                for(i=0; i<3; i++){
                  angle = vs[i][0].getAngle(vs[next_index(3, i)][0]);
                  if(angle > maxAngle){
                    maxAngle = angle;
                    maxAnglePair = [i, next_index(3, i)];
                  }
                }
                var x,y,z;
                //z is not in maxAnglePair
                var zIndex=0;
                for(i=0; i<3; i++){
                  if(i != maxAnglePair[0] && i != maxAnglePair[1]){
                    zIndex = i;
                    break;
                  }
                }
                angle = vs[maxAnglePair[0]][0].getDirectedAngle(vs[maxAnglePair[1]][0]);
                if(angle<0){
                  vertexes[key].connection = [
                    ""+anotherPoint(vs[maxAnglePair[1]][1], o),
                    ""+anotherPoint(vs[zIndex][1], o),
                    ""+anotherPoint(vs[maxAnglePair[0]][1], o)
                  ];
                }else{
                  vertexes[key].connection = [
                    ""+anotherPoint(vs[maxAnglePair[0]][1], o),
                    ""+anotherPoint(vs[zIndex][1], o),
                    ""+anotherPoint(vs[maxAnglePair[1]][1], o)
                  ];
                }
              }else if(vertexes[key].vType=='Y' || vertexes[key].vType=='T'){
                var o = vertexes[key].position;
                var vs = [];
                vertexes[key].edgesIndex.forEach(function(edgeIndex){
                  var p = new Point;
                  for(i=0; i<2; i++){
                    if(edges[edgeIndex].segments[i].point.equals(vertexes[key].position)){
                      continue;
                    }
                    p.x = edges[edgeIndex].segments[i].point.x - o.x;
                    p.y = edges[edgeIndex].segments[i].point.y - o.y;
                    vs.push([p, edgeIndex]);
                  }
                });
                vertexes[key].connection = [
                  ""+anotherPoint(vs[0][1], o),
                  ""+anotherPoint(vs[1][1], o),
                  ""+anotherPoint(vs[2][1], o)
                ];
              }
            });
            var s = "";
            Object.keys(vertexes).forEach(function(key){
              s += vertexes[key].vType + " " + vertexes[key].position + " [" + vertexes[key].connection + "]<br/>";
            });
            $d.html(s);
            break;
        }
        break;
    }
  };

  view.onFrame = function(event){
    switch(mode){
      case MODE.DRAWING:
        $("#mode").children().removeClass("active");
        $("#drawing").addClass("active");
        break;
      case MODE.EDITING:
        $("#mode").children().removeClass("active");
        $("#editing").addClass("active");
        break;
      case MODE.LABELING:
        $("#mode").children().removeClass("active");
        $("#labeling").addClass("active");
        break;
    }
  };
};
