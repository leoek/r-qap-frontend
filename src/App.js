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

const getTransFormData = ({ xProp, yProp, useSolutionIndex }) => {
  if (!xProp || xProp === yProp) {
    return compose(
      sortSolutions(["createdSolutions"], ["asc"]),
      (solutions) =>
        solutions.map((sol, i) => ({
          ...sol,
          x: useSolutionIndex ? i : get(sol, "createdSolutions"),
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

const getXTitle = ({ xProp, yProp, useSolutionIndex }) => {
  if (xProp === yProp){
    if (useSolutionIndex){
      return "solution #"
    }
    return "~createdSolutions"
  }
  return xProp;
}

const App = () => {
  const [instance, setInstance] = useState(null);
  const [solutions, setSolutions] = useState([]);

  useEffect(() => {
    if (!instance) {
      fetch("input-nug30a-100000.jsonlog").then((response) =>
        response.text().then((txt) => {
          const solutions = [];
          txt.split("\n").forEach((line) => {
            if (line) {
              const parsed = JSON.parse(line);
              const { type, ...rest } = parsed;
              if (type === "instance") {
                setInstance(rest.instance);
              } else if (type === "solution") {
                solutions.push(rest);
              }
            }
          });
          setSolutions(solutions);
        })
      );
    }
  });

  const solutionProps = [
    "flowDistanceSum",
    "failureRiskSum",
    "singleFactoryFailureScore",
  ];
  let plots = [];
  solutionProps.forEach((a) => {
    solutionProps.forEach((b) => {
      plots.push({ xProp: a, yProp: b });
      if (a===b){
        plots.push({ xProp: a, yProp: b, useSolutionIndex: true });
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
                  type={options.yProp === options.xProp ? "MarkSeries" : undefined}
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
