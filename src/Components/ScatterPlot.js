
import React from 'react';

import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalGridLines,
  LineMarkSeries,
  LineSeries,
  MarkSeries
} from 'react-vis';

const Scatterplot = props => {

  const { width, height, data, type, xTitle, yTitle } = props;
  return (
    <XYPlot width={width} height={height}>
      <VerticalGridLines />
      <HorizontalGridLines />
      <XAxis title={xTitle} />
      <YAxis title={yTitle} />
      {type === "LineMarkSeries" && <LineMarkSeries
        className="linemark-series-example"
        style={{
          strokeWidth: '1px'
        }}
        lineStyle={{stroke: 'red'}}
        markStyle={{stroke: 'blue'}}
        data={data}
      />}
      {type === "LineSeries" && <LineSeries
        className="linemark-series-example"
        style={{
          strokeWidth: '1px'
        }}
        lineStyle={{stroke: 'red'}}
        data={data}
      />}
      {type === "MarkSeries" && <MarkSeries
        className="mark-series-example"
        sizeRange={[1, 1]}
        data={data}
      />}
    </XYPlot>
  );
}

Scatterplot.defaultProps = {
    width: 300,
    height: 300,
    type: "LineMarkSeries"
}

export default Scatterplot;
