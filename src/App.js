import "../node_modules/react-vis/dist/style.css";

import React, { useState, useEffect } from "react";
import get from "lodash/get";
import groupBy from "lodash/groupBy";
import { compose } from "recompose";

import ForceSimulationChart from "./Components/ForceSimulationChart";
import ScatterPlot from "./Components/ScatterPlot";
import { orderBy } from "lodash";

const displayForceSimulation = false;

const flattenSolutions = (solutions) =>
  solutions.map(({ solution, ...rest }) => ({
    ...rest,
    ...solution,
  }));

const filterBetterQuality = solutions => {
  let best;
  const result = [];
  if (solutions.length < 1){
    return result;
  }
  result.push(solutions[0]);
  best = solutions[0]?.quality;
  for (let i = 1; i < solutions.length; i++){
    if (solutions[i]?.quality < best){
      result.push(solutions[i]);
      best = solutions[i]?.quality;
    }
  }
  return result;
}

const filterNotDominatedSolutions = (filters) => (solutions) => {
  const result = [];
  solutions.forEach((currentSol) => {
    if (
      solutions.some((sol) => {
        /**
         * only >= 0 filters and at least one > 0 => currentSol is dominated by sol
         */
        const filterResults = filters.map((filter) => filter(currentSol, sol));
        return (
          filterResults.every((val) => val >= 0) &&
          filterResults.some((val) => val > 0)
        );
      })
    ) {
      // currentSol is dominated by sol
    } else {
      result.push(currentSol);
    }
  });
  return result;
};

const getSolutionsToData = ({ xProp, yProp }) => (solutions) =>
  solutions.map((sol) => ({
    ...sol,
    x: get(sol, xProp),
    y: get(sol, yProp),
  }));

/**
 *
 * @param  {...any} iteratees like lodash sortBy
 */
const sortSolutions = (...iteratees) => (solutions) =>
  orderBy(solutions, ...iteratees);

const getTransFormData = ({ xProp, yProp, useSolutionIndex, xFactor = 1 }) => {
  if (!xProp || xProp === "createdSolutions") {
    return compose(
      sortSolutions([xProp], ["asc"]),
      filterBetterQuality,
      (solutions) =>
        solutions.map((sol, i) => ({
          ...sol,
          x: useSolutionIndex ? i : get(sol, "createdSolutions") * xFactor,
          y: get(sol, yProp),
          size: 1
        })),
      flattenSolutions
    );
  }

  const dominationFilters = [
    (a, b) => get(a, xProp) - get(b, xProp),
    (a, b) => get(a, yProp) - get(b, yProp),
  ];
  return compose(
    getSolutionsToData({ xProp, yProp }),
    sortSolutions([xProp], ["asc"]),
    filterNotDominatedSolutions(dominationFilters),
    flattenSolutions
  );
};

const getXTitle = ({ xProp, useSolutionIndex }) => {
  if (!xProp || xProp === "createdSolutions") {
    if (useSolutionIndex){
      return "solution #"
    }
    return "~createdSolutions"
  }
  return xProp;
}

const App = () => {
  const [instance, setInstance] = useState(null);
  const [parameters, setParameters] = useState(null);
  const [solutions, setSolutions] = useState([]);

  console.log({ instance, parameters });

  useEffect(() => {
    if (!instance) {
      fetch("nug12b-s10k-2.jsonlog").then((response) =>
        response.text().then((txt) => {
          const solutions = [];
          txt.split("\n").forEach((line) => {
            if (line) {
              const parsed = JSON.parse(line);
              const { type, ...rest } = parsed;
              if (type === "instance") {
                setInstance(rest.instance);
              } else if (type === "parameters") {
                setParameters(rest.parameters);
              } else if (type === "solution") {
                if (rest.createdSolutions > 0){
                  solutions.push(rest);
                }
              }
            }
          });
          setSolutions(solutions);
        })
      );
    }
  });

  const solutionProps = [
    "flowDistance",
    "failureRisk",
    "singleFactoryFailure",
  ];
  let plots = [];
  plots.push({ xProp: "createdSolutions", yProp: "quality", type: "LineSeries", xFactor: parameters?.agents })
  solutionProps.forEach((a) => {
    solutionProps.forEach((b) => {
      if (a === b){
        plots.push({ xProp: "createdSolutions", yProp: b, type: "LineSeries", xFactor: parameters?.agents });
      } else {
        plots.push({ xProp: a, yProp: b });
      }
    });
  });
  //plots = [{ xProp: "flowDistanceSum", yProp: "failureRiskSum" }]
  const groupedPlots = groupBy(plots, (p) => p.yProp);
  return (
    <div className="App">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {Object.keys(groupedPlots).map((key) => (
          <div style={{ display: "flex", flexDirection: "row" }} key={key}>
            {[
              <div
                key="label"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: 320,
                  alignItems: "center",
                }}
              >
                <span>{key}</span>
              </div>,
              ...groupedPlots[key].map((options) => (
                <ScatterPlot
                  xTitle={getXTitle(options)}
                  yTitle={options.yProp}
                  key={`${options.xProp}_${options.useSolutionIndex}`}
                  type={options.type}
                  data={getTransFormData(options)(solutions)}
                />
              )),
            ]}
          </div>
        ))}
      </div>
      {displayForceSimulation && <ForceSimulationChart />}
    </div>
  );
};

export default App;
