
import React from 'react';

import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalGridLines,
  LineMarkSeries
} from 'react-vis';

const Scatterplot = props => {

  const { width, height, data } = props;

  return (
    <XYPlot width={width} height={height}>
      <VerticalGridLines />
      <HorizontalGridLines />
      <XAxis />
      <YAxis />
      <LineMarkSeries
        className="linemark-series-example"
        style={{
          strokeWidth: '1px'
        }}
        lineStyle={{stroke: 'red'}}
        markStyle={{stroke: 'blue'}}
        data={data}
      />
    </XYPlot>
  );
}

Scatterplot.defaultProps = {
    width: 300,
    height: 300
}

export default Scatterplot;
