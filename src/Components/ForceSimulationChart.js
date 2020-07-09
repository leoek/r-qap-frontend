import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import get from "lodash/get";
import sumBy from "lodash/sumBy";
import min from "lodash/min"

const getD3ContainerId = (prefix = "") => prefix + "d3-container";

const nodeColor = "#222222";
const linkColor = "#222222";
const width = 1000;
const height = 800;

const getFactoryIndexFromSolution = (sol, machineIndex) =>
  sol.solution.permutation[machineIndex][0];

let simulation;

const renderD3 = (optimizationResult, solutionIndex = 0, useFlowDistance = false) => {
  const {
    instance: {
      factories,
      machines,
      flowMatrix: { matrix: flowMatrix },
      distanceMatrix: { matrix: distanceMatrix },
    },
    solutions,
  } = optimizationResult;
  const sol = solutions[solutionIndex];

  factories.forEach(f => { f.machines = [] })

  let links = [];
  for (let i = 0; i < machines.length; i++) {
    machines[i].id = i;
    const f_i = getFactoryIndexFromSolution(sol, i);
    for (let k = 0; k < machines.length; k++) {
      const f_k = getFactoryIndexFromSolution(sol, k);
      links.push({
        source: f_i,
        target: f_k,
        distance: distanceMatrix[f_i][f_k],
        flow: flowMatrix[i][k],
      });
    }
    /*
    if (Array.isArray(factories[f_i].machines)) {
      factories[f_i].machines.push(machines[i]);
    } else {
      factories[f_i].machines = [machines[i]];
    }
    */
  }
  links = links.sort((a,b) => {
    const source = a.source - b.source
    if (source !== 0){
      return source;
    }
    return a.target - b.target
  })
  links = links.filter((l) => l.distance > 0);

  const nodes = factories.map((f, i) => ({
    id: i,
    capacity: f.capacity,
    pFailure: f.pFailure,
    machines: f.machines,
    usedCapacity: sumBy(f.machines, (m) => m.size),
    x: width / 2,
    y: height / 2
  }));
  console.log({ sol, links, nodes, flows: links.map(l => l.flow) });

  //const flowDistanceFn = (d) => d.flow * d.distance * 0.2;
  //const distanceFn = (d) => d.distance * 10
  const flowDistanceFn = (d) => d.flow * d.distance * 0.0001;
  const distanceFn = (d) => d.distance * 0.01
  const getDistance = useFlowDistance ? flowDistanceFn : distanceFn;

  const getLinkOpacity = d => min([d.flow / 500, 1])
  const getLinkWidth = () => 1

  //d3.select(getD3ContainerId("#")).select("svg").remove();

  if (!simulation) {
    const svg = d3
      .select(getD3ContainerId("#"))
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("margin-left", 50)
      .style("margin-top", 50);

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.capacity * 3)
      .attr("fill", nodeColor)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)

    const link = svg
      .append("g")
      .attr("stroke", linkColor)
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-opacity", getLinkOpacity)
      .attr("stroke-width", getLinkWidth);
    //.attr("stroke-width", (d) => Math.sqrt(d.flow));

    simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-100))
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(getDistance)
      )
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    node
      .append("title")
      .text(
        (d) =>
          `Factory ${d.id}, Machines ${d.machines
            .slice(1)
            .reduce(
              (m, result) => `${result}, ${m.id}`,
              get(d, "machines[0].id", "")
            )}`
      );
  } else {
    simulation.stop();
    const svg = d3.select(getD3ContainerId("#")).select("svg");
    svg
      .selectAll("line")
      .data(links)
      .attr("stroke-opacity", getLinkOpacity)
      .attr("stroke-width", getLinkWidth);
    /*
    svg
      .selectAll("circle")
      .select("title")
      .text(
        (d) =>
          `Factory ${d.id}, Machines ${d.machines
            .slice(1)
            .reduce(
              (result, m) => `${result}, ${m.id}`,
              get(d, "machines[0].id", "")
            )}`
      );
    */
    simulation.force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(getDistance)
    )
    
    simulation.alphaTarget(useFlowDistance ? 0.5 : 0).alpha(0.5).restart()
  }
};

const ForceSimulationChart = () => {
  const [optimizationResult, setOptimizationResult] = useState();
  const [solIndex, setSolIndex] = useState(0);
  const [autoIncreaseSolIndex, setAutoIncreaseSolIndex] = useState(false);
  const [useFlowDistance, setUseFlowDistance] = useState(false)

  if (autoIncreaseSolIndex) {
    setTimeout(() => {
      if (optimizationResult.solutions.length > solIndex + 1) {
        setSolIndex(solIndex + 1);
      } else {
        setAutoIncreaseSolIndex(false);
      }
    }, 100);
  }

  useEffect(() => {
    if (optimizationResult) {
      renderD3(optimizationResult, solIndex, useFlowDistance);
    } else {
      const newOptimizationResult = {
        solutions: [],
      };
      fetch("input-els19.jsonlog").then((response) =>
        response.text().then((txt) => {
          txt.split("\n").forEach((line) => {
            if (line) {
              const parsed = JSON.parse(line);
              const { type, ...rest } = parsed;
              if (type === "instance") {
                newOptimizationResult.instance = rest.instance;
              } else if (type === "solution") {
                newOptimizationResult.solutions.push(rest);
              }
            }
          });
          console.log(newOptimizationResult);
          setOptimizationResult(newOptimizationResult);
        })
      );
    }
  });

  return (
    <div>
      <div id={getD3ContainerId()}></div>
      <button
        onClick={() => {
          if (solIndex + 1 < optimizationResult.solutions.length) {
            setSolIndex(solIndex + 1);
          }
        }}
      >
        next Solution
      </button>
      <button
        onClick={() => {
          setSolIndex(solIndex - 1);
        }}
      >
        prev Solution
      </button>
      <button
        onClick={() => {
          setAutoIncreaseSolIndex(!autoIncreaseSolIndex);
        }}
      >
        auto next Solution
      </button>
      <button
        onClick={() => {
          setUseFlowDistance(!useFlowDistance);
        }}
      >
        toggle distance fn
      </button>
      <br></br>
      <br></br>
      <span>
        Solution Index: {solIndex}, Solution Quality:{" "}
        {optimizationResult?.solutions[solIndex].solution.quality}, Worker Id:{" "}
        {optimizationResult?.solutions[solIndex].workerId}, Created Solutions
        (approx): {optimizationResult?.solutions[solIndex].createdSolutions},
        {useFlowDistance ? "flowDistance" : "distance"}
      </span>
    </div>
  );
};

export default ForceSimulationChart;
