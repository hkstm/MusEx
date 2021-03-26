import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import "./Graph.sass";
import { faMusic} from "@fortawesome/free-solid-svg-icons";

interface GraphProps {
  enabled: boolean;
  width: number;
  height: number;
  data: MusicGraph;
  useForce?: boolean;
}

export interface GraphState {
  zoomLevel: number;
  selectlist: string[];
}

 type SimNode = MusicGraphNode;
// type SimLink = d3.SimulationLinkDatum<MusicGraphNode>;

export default class Graph extends React.Component<GraphProps, GraphState> {
  ref!: HTMLDivElement;
  svg!: d3.Selection<SVGSVGElement, MusicGraph, null, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, null, any>;
  force: any;

  constructor(props: GraphProps) {
    super(props);
    this.state = {
      zoomLevel: 1,
      selectlist: [],    
    };
  }

  updateGraph = () => {
    
    if (!this.props.enabled) return;
    if (!this.props.data) return;
    console.log("updating the graph");
    console.log(this.props.data);
    

   
    // Create scale
    const padding = 30;
    const x_scale = d3
      .scaleLinear()
      .domain([d3.min(this.props.data.nodes,function(d:any){return d.x}), d3.max(this.props.data.nodes, function(d:any){ return d.x; })])
      .range([padding, this.props.width - padding]);
    const y_scale = d3
      .scaleLinear()
      .domain([d3.max(this.props.data.nodes, function(d:any){ return d.y; }),d3.min(this.props.data.nodes,function(d:any){return  d.y})])
      .range([padding, this.props.height - padding]);

    // Add scales to axis
    const x_axis = d3.axisBottom(x_scale);
    const y_axis = d3.axisLeft(y_scale);

    this.svg
        .append("g")
        .attr("class","xaxis")
        .attr("transform", `translate(0,${this.props.height - padding})`)
        .call(x_axis);

    this.svg
        .append("g")
        .attr("class","yaxis")
        .attr("transform", `translate(${padding},0)`)
        .call(y_axis);



    if (this.props.useForce ?? false) {
      // const forceLink = d3
      //   .forceLink<SimNode, SimLink>(this.props.data.links)
      //   .id((d: MusicGraphNode) => {
      //     return d.name;
      //   })
      //   .distance(50)
      //   .links(this.props.data.links);
      // const force = d3
      //   .forceSimulation<SimNode, SimLink>(this.props.data.nodes)
      //   .nodes(this.props.data.nodes)
      //   .force("link", forceLink)
      //   .force("charge", d3.forceManyBody().strength(-120))
      //   .force(
      //     "center",
      //     d3.forceCenter(this.props.width / 2, this.props.height / 2)
      //   );
    }
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const nodes = this.graph
      .append("g")
      .attr("class", "nodes")
      .selectAll(".nodes")
      .data(this.props.data.nodes)
      .enter()
      .append<SVGCircleElement>("circle")
      .attr("class", "node")
      .attr("r", (d:MusicGraphNode)=>(d.size??0) * 0.35) // ** Scaled down nodes radius  **
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height) // ** Fixed the cx and cy values**
      .style("stroke", (d:MusicGraphNode)=>d.id in this.state.selectlist? "#F8FF20" :"#FFFFFF")
      .style("stroke-width", 1.5)
      .style("opacity", 0.8) // ** Added transparency for better visualization **
      .style("fill",(d: MusicGraphNode) =>
        d.genre && d.genre.length > 0 ? color(d.genre.join("/")) : "white"
      )
      .each(function(){
        var sel=d3.select(this)
        var state = false;
        sel.on("click",function(){
          state = !state
          if (state){
            sel.style("stroke","#F8FF20")
          }else{
            sel.style("stroke","#FFFFFF")
          }
        })
      });
       

      nodes.append<SVGImageElement>("image")
        .attr('xlink:href', "music-solid.svg")
        .attr('width', function(d) { return (d.size ??0)*0.35+'px'} )
        .attr('height', function(d) { return (d.size ??0)*0.35+'px'} )
        .attr("x",(d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
        .attr("y",(d: MusicGraphNode) => (d.y ?? 0) * this.props.height)
        .attr("class", "fa");
        // .text(function(d) { return '\uf001' }); 


    const enlarge = 4000;
    const labels = this.graph
      .append("g")
      .attr("class", "labels")
      .selectAll(".labels")
      // .data(this.props.data.nodes, (d: MusicGraphNode) => d.name)
      .data(this.props.data.nodes)
      .enter()
      .append<SVGTextElement>("text")
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width + (d.size??0) * 0.35  + 5 )
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height + 5) // ** Updated x,y values for the labels **
      .attr("class", "label")
      .attr("fill", "white")
      .text((d) => d.name);

    const links = this.graph
      .append("g")
      .selectAll("line")
      .data(this.props.data.links)
      .enter()
      .append("line")
      // .attr("x", (d: MusicGraphLink) => (d.x ?? 0) * this.props.width * enlarge)
      // .attr("y", (d: MusicGraphLink) => (d.y ?? 0) * this.props.height* enlarge)
      .style("stroke", "#999999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", "2px");

/*  //TODO - Delete this as nodes are drawn before the labels now 
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const nodes = this.graph
      .append("g")
      .attr("class", "nodes")
      .selectAll(".nodes")
      .data(this.props.data.nodes)
      .enter()
      .append<SVGCircleElement>("circle")
      .attr("class", "node")
      .attr("r", (d:MusicGraphNode)=>(d.size??0))
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0))
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0))
      .style("stroke", "#FFFFFF")
      .style("stroke-width", 1.5)
      .style("fill", (d: MusicGraphNode) =>
        d.genre && d.genre.length > 0 ? color(d.genre.join("/")) : "white"
      );
  */
 const zoom = d3.zoom<SVGSVGElement, MusicGraph>()
 .scaleExtent([0.5, 32])
 .on("zoom", (event) => {

 this.graph.attr("transform", event.transform);
 // console.log(event);
 this.setState({ zoomLevel: event.transform.k });
 const zx = event.transform.rescaleX(x_scale).interpolate(d3.interpolateRound);
 const zy = event.transform.rescaleY(y_scale).interpolate(d3.interpolateRound);
 nodes.attr("transform", event.transform).attr("r", (d:MusicGraphNode)=>(d.size??0) * 0.35 / event.transform.k );
 nodes.attr("transform", event.transform).attr("stroke-width", 1.5/ event.transform.k);
 labels.attr("transform", event.transform).attr("stroke-width", 5 / event.transform.k);
 labels.attr("transform", event.transform).attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width + (d.size??0) * 0.35  + 5/ event.transform.k )
 labels.attr("transform", event.transform).attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height + 5/ (event.transform.k + 15))
 this.svg.selectAll(".xaxis").call(zx);
 this.svg.selectAll(".yaxis").call(zy);
});



this.svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

    if (this.props.useForce ?? false) {
      this.force.on("tick", () => {
        links
          .attr(
            "x1",
            (d: MusicGraphLink) => (d.source.x ?? 0) * this.props.width
          )
          .attr(
            "y1",
            (d: MusicGraphLink) => (d.source.y ?? 0) * this.props.height
          )
          .attr(
            "x2",
            (d: MusicGraphLink) => (d.target.x ?? 0) * this.props.width
          )
          .attr(
            "y2",
            (d: MusicGraphLink) => (d.target.y ?? 0) * this.props.height
          );
        labels
          .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
          .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
        nodes
          .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
          .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
      });
    }
  };
  

  componentDidUpdate(prevProps: GraphProps) {
    if (prevProps.data !== this.props.data) {
      d3.selectAll(".xaxis").remove()
      d3.selectAll(".yaxis").remove()
      d3.selectAll(".nodes").remove()
      d3.selectAll(".labels").remove()
      this.updateGraph();
    }
  }

  componentDidMount() {
    this.svg = d3
      .select<HTMLDivElement, MusicGraph>(this.ref)
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.graph = this.svg
      .append("g")
      .attr("class", "graph")
      .attr("width", this.props.width )
      .attr("height", this.props.height);

    this.updateGraph();
  }

  render() {
    return (
      <div>
        <div
          className="graph-container"
          ref={(ref: HTMLDivElement) => (this.ref = ref)}
        ></div>
        <div className="graph-metrics">
          <span>Zoom Level: {Math.round(this.state.zoomLevel)}</span>
        </div>
      </div>
    );
  }
}
