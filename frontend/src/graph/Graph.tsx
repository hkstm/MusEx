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
    
    const largeNodeLabel = 65; //change this value for a different treshold for  the node labels that should always remain visible
      

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const nodes = this.graph
      .append("g")
      .attr("class", "nodes")
      .selectAll(".nodes")
      .data(this.props.data.nodes)
      .enter()
      .append<SVGCircleElement>("circle")
      .attr("class", "node")
      .attr("id",(d)=>d.name)
      .attr("r", (d:MusicGraphNode)=>(d.size??0) * 0.35) // ** Scaled down nodes radius  **
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height) // ** Fixed the cx and cy values**
      .style("stroke", (d:MusicGraphNode)=>d.id in this.state.selectlist? "#F8FF20" :"#FFFFFF")
      .style("stroke-width", 1.5)
      .style("opacity", 0.8) // ** Added transparency for better visualization **
      .style("fill",(d: MusicGraphNode) =>
        d.genre && d.genre.length > 0 ? color(d.genre.join("/")) : "white"
      )
            nodes.each(function(){
              var sel=d3.select(this)                                         // get the individual clicked on node
              var state = false;                                              // state to remember whether a node is highlighted or not
              var musicOn= false;                                             // state to  remember whether  music  is playing or  not
              var fragment:any   
              var name =  sel.attr("id")   
              name = name.replace('&','and').replace(`'`," ").replace(/\s+/g, '');                                   //where we will  load our urls later on            
              sel.on("click",function(event){                                 //start onclick event
              var shiftKeyPressed = event.shiftKey  
              if(shiftKeyPressed){                                            //Did the user hold the shiftkey?
                nodes.append<HTMLMediaElement>("audio")                       //add  the audio elements to the nodes
                .attr("id","audioElement")
                .attr("src",(d:MusicGraphNode)=>(d.preview_url??""));
                var music = sel.select("#audioElement").attr("src")           //get the audio url
                musicOn = !musicOn                                            //change state of music
                  if (musicOn){ 
                  fragment = new Audio(music)                                 //if music is now set to "on"
                  fragment.play() 
                  console.log(musicOn)                                        //play thee fragment
                }else{                                                        //If music is set to "off"
                  fragment!.pause()
                  console.log(musicOn)
                  console.log(fragment)
                  fragment!.currentTime = 0;
                }
              }else{
                nodes.selectAll("#audioElement").remove()       //remove audioelement so we can access the node itself
                  state = !state
                  if (state){                                     //if node  is selected
                    sel.style("stroke","#F8FF20")
                    .style("stroke-width", 5)
                  }else{                                        //if node is  unselected
                    sel.style("stroke","#FFFFFF")
                    .style("stroke-width", 1.5)
                  }
                }
              }) 
              sel.on("mouseover",function(event){
                // alert("test")
                return d3.selectAll("#"+name).style("visibility","visible")
              })
              sel.on("mouseout",function(){
                return d3.selectAll(".label").style("visibility","hidden")
              })
            
            });
                
        const enlarge = 4000;
        const labels = this.graph
          .append("g")
          .attr("class", "labels")
          .selectAll(".labels")
          .data(this.props.data.nodes)
          .enter() 
          .append<SVGTextElement>("text") 
          .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width + (d.size??0) * 0.35  + 5 )
          .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height + 5) // ** Updated x,y values for the labels **
          .attr("class", (d:MusicGraphNode)=> (d.size! >largeNodeLabel )?"labelAlwaysVisible":"label")
          .attr("fill", "white")
          .style("stroke", "black")
          .style("stroke-width", 0.3)
          .attr("id",(d)=>d.name.replace('&','and').replace(`'`," ").replace(/\s+/g, ''))
          .text((d) => d.name)
          .style("visibility", (d: MusicGraphNode) => ((d.size! >largeNodeLabel ))? "visible":"hidden") //only show the labels of nodes with  a size  > 70
   
        


    const links = this.graph
      .append("g")
      .attr("class","line")
      .selectAll("line")
      .data(this.props.data.links)
      .enter()
      .append("line")
      // .attr("x", (d: MusicGraphLink) => (d.x ?? 0) * this.props.width * enlarge)
      // .attr("y", (d: MusicGraphLink) => (d.y ?? 0) * this.props.height* enlarge)
      .style("stroke", "#999999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", "2px");


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
