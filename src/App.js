import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import get from "lodash/get";
import sumBy from "lodash/sumBy";

import "./App.css";

const getD3ContainerId = (prefix = "") => prefix + "d3-container";

const links = [
  { source: "a", target: "b", distance: 1, value: 10 },
  { source: "b", target: "c", distance: 2, value: 1 },
  { source: "a", target: "c", distance: 2, value: 1 },
];
const nodeColor = "#222222";
const linkColor = "#222222";
const width = 1000;
const height = 800;

const getFactoryIndexFromSolution = (sol, machineIndex) =>
  sol.solution.permutation[machineIndex][0];

const renderD3 = (optimizationResult, solutionIndex = 0) => {
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
        flow: flowMatrix[f_i][f_k],
      });
    }
    if (Array.isArray(factories[f_i].machines)) {
      factories[f_i].machines.push(machines[i]);
    } else {
      factories[f_i].machines = [machines[i]];
    }
  }
  links = links.filter((l) => l.distance > 0 && l.flow > 0);

  const nodes = factories.map((f, i) => ({
    id: i,
    capacity: f.capacity,
    pFailure: f.pFailure,
    machines: f.machines,
    usedCapacity: sumBy(f.machines, (m) => m.size),
  }));
  console.log({ links, nodes });

  d3.select(getD3ContainerId("#")).select("svg").remove();

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
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", (d) => d.capacity * 5)
    .attr("fill", nodeColor);

  const link = svg
    .append("g")
    .attr("stroke", linkColor)
    .attr("stroke-opacity", 0.5)
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke-width", (d) => d.flow);
  //.attr("stroke-width", (d) => Math.sqrt(d.flow));

  const simulation = d3
    .forceSimulation(nodes)
    .force("charge", d3.forceManyBody())
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((d) => d.distance * 50)
    )
    .force("center", d3.forceCenter(width / 2, height / 2));

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

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });
};

const App = () => {
  const [optimizationResult, setOptimizationResult] = useState();
  const [solIndex, setSolIndex] = useState(0);
  const [autoIncreaseSolIndex, setAutoIncreaseSolIndex] = useState(false);

  if (autoIncreaseSolIndex) {
    setTimeout(() => {
      setSolIndex(solIndex + 1);
    }, 1000);
  }

  useEffect(() => {
    if (optimizationResult) {
      renderD3(optimizationResult, solIndex);
    } else {
      const newOptimizationResult = {
        solutions: [],
      };
      fetch("input.jsonlog").then((response) =>
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
    <div className="App">
      <div id={getD3ContainerId()}></div>
      <button
        onClick={() => {
          setSolIndex(solIndex + 100);
        }}
      >
        next Solution
      </button>
      <button
        onClick={() => {
          setAutoIncreaseSolIndex(true);
        }}
      >
        auto next Solution
      </button>
      <br></br>
      <br></br>
      <span>
        Solution Index: {solIndex}, Solution Quality:{" "}
        {optimizationResult?.solutions[solIndex].solution.quality}, Worker Id:{" "}
        {optimizationResult?.solutions[solIndex].workerId}, Created Solutions
        (approx): {optimizationResult?.solutions[solIndex].createdSolutions}
      </span>
    </div>
  );
};

export default App;
