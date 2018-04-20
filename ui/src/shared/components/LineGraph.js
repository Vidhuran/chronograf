import React, {Component} from 'react'
import PropTypes from 'prop-types'
import Dygraph from 'shared/components/Dygraph'
import shallowCompare from 'react-addons-shallow-compare'

import SingleStat from 'src/shared/components/SingleStat'
import timeSeriesToDygraph from 'utils/timeSeriesTransformers'

import {colorsStringSchema} from 'shared/schemas'
import {ErrorHandlingWith} from 'src/shared/decorators/errors'
import InvalidData from 'src/shared/components/InvalidData'

@ErrorHandlingWith(InvalidData)
class LineGraph extends Component {
  constructor(props) {
    super(props)
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  componentWillMount() {
    const {data, isInDataExplorer} = this.props
    this._timeSeries = timeSeriesToDygraph(data, isInDataExplorer)
  }

  componentWillUpdate(nextProps) {
    const {data, activeQueryIndex} = this.props
    if (
      data !== nextProps.data ||
      activeQueryIndex !== nextProps.activeQueryIndex
    ) {
      this._timeSeries = timeSeriesToDygraph(
        nextProps.data,
        nextProps.isInDataExplorer
      )
    }
  }

  render() {
    const {
      data,
      axes,
      cell,
      title,
      colors,
      onZoom,
      queries,
      hoverTime,
      timeRange,
      cellHeight,
      ruleValues,
      isBarGraph,
      resizeCoords,
      isRefreshing,
      setResolution,
      isGraphFilled,
      showSingleStat,
      displayOptions,
      staticLegend,
      underlayCallback,
      overrideLineColors,
      isFetchingInitially,
      handleSetHoverTime,
    } = this.props

    const {labels, timeSeries, dygraphSeries} = this._timeSeries

    // If data for this graph is being fetched for the first time, show a graph-wide spinner.
    if (isFetchingInitially) {
      return <GraphSpinner />
    }

    const options = {
      ...displayOptions,
      title,
      labels,
      rightGap: 0,
      yRangePad: 10,
      labelsKMB: true,
      fillGraph: true,
      underlayCallback,
      axisLabelWidth: 60,
      drawAxesAtZero: true,
      axisLineColor: '#383846',
      gridLineColor: '#383846',
      connectSeparatedPoints: true,
    }

    const containerStyle = {
      width: 'calc(100% - 32px)',
      height: 'calc(100% - 16px)',
      position: 'absolute',
      top: '8px',
    }

    const prefix = axes ? axes.y.prefix : ''
    const suffix = axes ? axes.y.suffix : ''

    return (
      <div className="dygraph graph--hasYLabel" style={{height: '100%'}}>
        {isRefreshing ? <GraphLoadingDots /> : null}
        <Dygraph
          cell={cell}
          axes={axes}
          colors={colors}
          onZoom={onZoom}
          labels={labels}
          hoverTime={hoverTime}
          queries={queries}
          options={options}
          timeRange={timeRange}
          isBarGraph={isBarGraph}
          timeSeries={timeSeries}
          ruleValues={ruleValues}
          resizeCoords={resizeCoords}
          dygraphSeries={dygraphSeries}
          setResolution={setResolution}
          handleSetHoverTime={handleSetHoverTime}
          overrideLineColors={overrideLineColors}
          containerStyle={containerStyle}
          staticLegend={staticLegend}
          isGraphFilled={showSingleStat ? false : isGraphFilled}
        >
          {showSingleStat && (
            <SingleStat
              prefix={prefix}
              suffix={suffix}
              data={data}
              lineGraph={true}
              colors={colors}
              cellHeight={cellHeight}
            />
          )}
        </Dygraph>
      </div>
    )
  }
}

const GraphLoadingDots = () => (
  <div className="graph-panel__refreshing">
    <div />
    <div />
    <div />
  </div>
)

const GraphSpinner = () => (
  <div className="graph-fetching">
    <div className="graph-spinner" />
  </div>
)

const {array, arrayOf, bool, func, number, shape, string} = PropTypes

LineGraph.defaultProps = {
  underlayCallback: () => {},
  isGraphFilled: true,
  overrideLineColors: null,
  staticLegend: false,
}

LineGraph.propTypes = {
  axes: shape({
    y: shape({
      bounds: array,
      label: string,
    }),
    y2: shape({
      bounds: array,
      label: string,
    }),
  }),
  hoverTime: string,
  handleSetHoverTime: func,
  title: string,
  isFetchingInitially: bool,
  isRefreshing: bool,
  underlayCallback: func,
  isGraphFilled: bool,
  isBarGraph: bool,
  staticLegend: bool,
  overrideLineColors: array,
  showSingleStat: bool,
  displayOptions: shape({
    stepPlot: bool,
    stackedGraph: bool,
  }),
  activeQueryIndex: number,
  ruleValues: shape({}),
  timeRange: shape({
    lower: string.isRequired,
  }),
  isInDataExplorer: bool,
  setResolution: func,
  cellHeight: number,
  cell: shape(),
  onZoom: func,
  resizeCoords: shape(),
  queries: arrayOf(shape({}).isRequired).isRequired,
  data: arrayOf(shape({}).isRequired).isRequired,
  colors: colorsStringSchema,
}

export default LineGraph
