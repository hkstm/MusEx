// https://observablehq.com/@marialuisacp/heatmap@124
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], function(md){return(
md`# Heatmap

Development of a basic heatmap in d3.js v5.`
)});
  main.variable(observer("chart")).define("chart", ["d3","DOM","width","height","margin","x_scale","y_scale","data","color_scale"], function(d3,DOM,width,height,margin,x_scale,y_scale,data,color_scale)
{
  const svg = d3.select(DOM.svg(width, height))
  const g = svg.attr('width', width - margin.left)
   .attr('height', height + margin.top + margin.bottom)
   .append('g')
   .attr('transform', 'translate(' + margin.left + ', 0)')
  
  g.append('g')
    .attr('transform', 'translate(0,' +  height +')')
    .call(d3.axisBottom(x_scale))
  g.append('g')
    .call(d3.axisLeft(y_scale))
  
  svg.selectAll()
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d) => x_scale(d.t) + margin.left)
    .attr('y', (d) => y_scale(d.n))
    .attr('width', x_scale.bandwidth())
    .attr('height', (d) => 50)
    .attr('fill', (d) => color_scale(d.value))
  
  return svg.node()
}
);
  main.variable(observer("color_scale")).define("color_scale", ["d3"], function(d3){return(
d3.scaleLinear()
  .domain([0, 100])
  .range(['#fff', '#A3320B'])
)});
  main.variable(observer("data")).define("data", ["buildData"], function(buildData){return(
buildData()
)});
  main.variable(observer("buildData")).define("buildData", ["d3","types"], function(d3,types){return(
() => {
  let array = []
  d3.range(10).map((d) => {
    const o = types.map((t) => ({
      t: t,
      n: d,
      value: Math.random() * 100
    }))
    array = [...array,...o]
  })
  return array
}
)});
  main.variable(observer("y_scale")).define("y_scale", ["d3","height"], function(d3,height){return(
d3.scaleBand().domain(d3.range(10)).range([height, 0])
)});
  main.variable(observer("x_scale")).define("x_scale", ["d3","types","width"], function(d3,types,width){return(
d3.scaleBand()
.domain(types)
.range([0, width])
)});
  main.variable(observer("types")).define("types", function(){return(
['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
)});
  main.variable(observer("margin")).define("margin", function(){return(
{ top: 50, left: 40, right: 40, bottom: 50 }
)});
  main.variable(observer("height")).define("height", function(){return(
500
)});
  main.variable(observer("d3")).define("d3", ["require"], function(require){return(
require('d3@5')
)});
  return main;
}
