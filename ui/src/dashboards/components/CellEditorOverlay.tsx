import React, {Component} from 'react'

import _ from 'lodash'
import uuid from 'uuid'

import ResizeContainer from 'src/shared/components/ResizeContainer'
import QueryMaker from 'src/dashboards/components/QueryMaker'
import Visualization from 'src/dashboards/components/Visualization'
import OverlayControls from 'src/dashboards/components/OverlayControls'
import DisplayOptions from 'src/dashboards/components/DisplayOptions'
import CEOBottom from 'src/dashboards/components/CEOBottom'

import * as queryModifiers from 'src/utils/queryTransitions'

import defaultQueryConfig from 'src/utils/defaultQueryConfig'
import {buildQuery} from 'src/utils/influxql'
import {getQueryConfig} from 'src/shared/apis'
import {IS_STATIC_LEGEND} from 'src/shared/constants'
import {ColorString, ColorNumber} from 'src/types/colors'
import {nextSource} from 'src/dashboards/utils/sources'

import {
  removeUnselectedTemplateValues,
  TYPE_QUERY_CONFIG,
} from 'src/dashboards/constants'
import {OVERLAY_TECHNOLOGY} from 'src/shared/constants/classNames'
import {MINIMUM_HEIGHTS, INITIAL_HEIGHTS} from 'src/data_explorer/constants'
import {AUTO_GROUP_BY} from 'src/shared/constants'
import {getCellTypeColors} from 'src/dashboards/constants/cellEditor'
import {TimeRange, Source, Query} from 'src/types'
import {Status} from 'src/types/query'
import {Cell, CellQuery, Legend} from 'src/types/dashboard'
import {ErrorHandling} from 'src/shared/decorators/errors'

const staticLegend: Legend = {
  type: 'static',
  orientation: 'bottom',
}

interface Template {
  tempVar: string
}

interface QueryStatus {
  queryID: string
  status: Status
}

interface Props {
  sources: Source[]
  editQueryStatus: () => void
  onCancel: () => void
  onSave: (cell: Cell) => void
  source: Source
  dashboardID: string
  queryStatus: QueryStatus
  autoRefresh: number
  templates: Template[]
  timeRange: TimeRange
  thresholdsListType: string
  thresholdsListColors: ColorNumber[]
  gaugeColors: ColorNumber[]
  lineColors: ColorString[]
  cell: Cell
}

interface State {
  queriesWorkingDraft: Query[]
  activeQueryIndex: number
  isDisplayOptionsTabActive: boolean
  isStaticLegend: boolean
}

const createWorkingDraft = (source: string, query: CellQuery): Query => {
  const {queryConfig} = query
  const draft: Query = {
    ...queryConfig,
    id: uuid.v4(),
    source,
  }

  return draft
}

const createWorkingDrafts = (source: string, queries: CellQuery[]): Query[] =>
  _.cloneDeep(
    queries.map((query: CellQuery) => createWorkingDraft(source, query))
  )

@ErrorHandling
class CellEditorOverlay extends Component<Props, State> {
  private overlayRef: HTMLDivElement

  private formattedSources = this.props.sources.map(s => ({
    ...s,
    text: `${s.name} @ ${s.url}`,
  }))

  constructor(props) {
    super(props)

    const {
      cell: {legend},
    } = props
    let {
      cell: {queries},
    } = props

    // Always have at least one query
    if (_.isEmpty(queries)) {
      queries = [{id: uuid.v4()}]
    }

    const queriesWorkingDraft = createWorkingDrafts(this.sourceLink, queries)

    this.state = {
      queriesWorkingDraft,
      activeQueryIndex: 0,
      isDisplayOptionsTabActive: false,
      isStaticLegend: IS_STATIC_LEGEND(legend),
    }
  }

  public componentWillReceiveProps(nextProps: Props) {
    const {status, queryID} = this.props.queryStatus
    const {queriesWorkingDraft} = this.state
    const {queryStatus} = nextProps

    if (
      queryStatus.status &&
      queryStatus.queryID &&
      (queryStatus.queryID !== queryID || queryStatus.status !== status)
    ) {
      const nextQueries = queriesWorkingDraft.map(
        q => (q.id === queryID ? {...q, status: queryStatus.status} : q)
      )
      this.setState({queriesWorkingDraft: nextQueries})
    }
  }

  public componentDidMount() {
    this.overlayRef.focus()
  }

  public render() {
    const {
      onCancel,
      templates,
      timeRange,
      autoRefresh,
      editQueryStatus,
    } = this.props

    const {
      activeQueryIndex,
      isDisplayOptionsTabActive,
      queriesWorkingDraft,
      isStaticLegend,
    } = this.state

    return (
      <div
        className={OVERLAY_TECHNOLOGY}
        onKeyDown={this.handleKeyDown}
        tabIndex={0}
        ref={this.onRef}
      >
        <ResizeContainer
          containerClass="resizer--full-size"
          minTopHeight={MINIMUM_HEIGHTS.visualization}
          minBottomHeight={MINIMUM_HEIGHTS.queryMaker}
          initialTopHeight={INITIAL_HEIGHTS.visualization}
          initialBottomHeight={INITIAL_HEIGHTS.queryMaker}
        >
          <Visualization
            timeRange={timeRange}
            templates={templates}
            autoRefresh={autoRefresh}
            queryConfigs={queriesWorkingDraft}
            editQueryStatus={editQueryStatus}
            staticLegend={isStaticLegend}
          />
          <CEOBottom>
            <OverlayControls
              onCancel={onCancel}
              queries={queriesWorkingDraft}
              sources={this.formattedSources}
              onSave={this.handleSaveCell}
              selected={this.findSelectedSource()}
              onSetQuerySource={this.handleSetQuerySource}
              isSavable={this.isSaveable}
              isDisplayOptionsTabActive={isDisplayOptionsTabActive}
              onClickDisplayOptions={this.handleClickDisplayOptionsTab}
            />
            {isDisplayOptionsTabActive ? (
              <DisplayOptions
                queryConfigs={queriesWorkingDraft}
                onToggleStaticLegend={this.handleToggleStaticLegend}
                staticLegend={isStaticLegend}
                onResetFocus={this.handleResetFocus}
              />
            ) : (
              <QueryMaker
                source={this.source}
                templates={templates}
                queries={queriesWorkingDraft}
                actions={this.queryActions}
                timeRange={timeRange}
                onDeleteQuery={this.handleDeleteQuery}
                onAddQuery={this.handleAddQuery}
                activeQueryIndex={activeQueryIndex}
                activeQuery={this.getActiveQuery()}
                setActiveQueryIndex={this.handleSetActiveQueryIndex}
                initialGroupByTime={AUTO_GROUP_BY}
              />
            )}
          </CEOBottom>
        </ResizeContainer>
      </div>
    )
  }

  private onRef = (r: HTMLDivElement) => {
    this.overlayRef = r
  }

  private queryStateReducer = queryModifier => (queryID, ...payload) => {
    const {queriesWorkingDraft} = this.state
    const query = queriesWorkingDraft.find(q => q.id === queryID)

    const nextQuery = queryModifier(query, ...payload)

    const nextQueries = queriesWorkingDraft.map(q => {
      if (q.id === query.id) {
        return {...nextQuery, source: nextSource(q, nextQuery)}
      }

      return q
    })

    this.setState({queriesWorkingDraft: nextQueries})
  }

  private handleAddQuery = () => {
    const {queriesWorkingDraft} = this.state
    const newIndex = queriesWorkingDraft.length

    this.setState({
      queriesWorkingDraft: [
        ...queriesWorkingDraft,
        {...defaultQueryConfig({id: uuid.v4()}), source: null},
      ],
    })
    this.handleSetActiveQueryIndex(newIndex)
  }

  private handleDeleteQuery = index => {
    const {queriesWorkingDraft} = this.state
    const nextQueries = queriesWorkingDraft.filter((__, i) => i !== index)

    this.setState({queriesWorkingDraft: nextQueries})
  }

  private handleSaveCell = () => {
    const {queriesWorkingDraft, isStaticLegend} = this.state
    const {cell, thresholdsListColors, gaugeColors, lineColors} = this.props

    const queries = queriesWorkingDraft.map(q => {
      const timeRange = q.range || {upper: null, lower: ':dashboardTime:'}

      return {
        queryConfig: q,
        query: q.rawText || buildQuery(TYPE_QUERY_CONFIG, timeRange, q),
        source: q.source,
      }
    })

    const colors = getCellTypeColors({
      cellType: cell.type,
      gaugeColors,
      thresholdsListColors,
      lineColors,
    })

    this.props.onSave({
      ...cell,
      queries,
      colors,
      legend: isStaticLegend ? staticLegend : {},
    })
  }

  private handleClickDisplayOptionsTab = isDisplayOptionsTabActive => () => {
    this.setState({isDisplayOptionsTabActive})
  }

  private handleSetActiveQueryIndex = activeQueryIndex => {
    this.setState({activeQueryIndex})
  }

  private handleToggleStaticLegend = isStaticLegend => () => {
    this.setState({isStaticLegend})
  }

  private handleSetQuerySource = source => {
    const queriesWorkingDraft = this.state.queriesWorkingDraft.map(q => ({
      ..._.cloneDeep(q),
      source,
    }))

    this.setState({queriesWorkingDraft})
  }

  private getActiveQuery = () => {
    const {queriesWorkingDraft, activeQueryIndex} = this.state

    return _.get(queriesWorkingDraft, activeQueryIndex, queriesWorkingDraft[0])
  }

  private handleEditRawText = async (url, id, text) => {
    const templates = removeUnselectedTemplateValues(this.props.templates)

    // use this as the handler passed into fetchTimeSeries to update a query status
    try {
      const {data} = await getQueryConfig(url, [{query: text, id}], templates)
      const config = data.queries.find(q => q.id === id)
      const nextQueries = this.state.queriesWorkingDraft.map(
        q => (q.id === id ? {...config.queryConfig, source: q.source} : q)
      )
      this.setState({queriesWorkingDraft: nextQueries})
    } catch (error) {
      console.error(error)
    }
  }

  private findSelectedSource = () => {
    const {source} = this.props
    const sources = this.formattedSources
    const currentSource = _.get(this.state.queriesWorkingDraft, '0.source')

    if (!currentSource) {
      const defaultSource = sources.find(s => s.id === source.id)
      return (defaultSource && defaultSource.text) || 'No sources'
    }

    const selected = sources.find(s => s.links.self === currentSource)
    return (selected && selected.text) || 'No sources'
  }

  private handleKeyDown = e => {
    switch (e.key) {
      case 'Enter':
        if (!e.metaKey) {
          return
        } else if (e.target === this.overlayRef) {
          this.handleSaveCell()
        } else {
          e.target.blur()
          setTimeout(this.handleSaveCell, 50)
        }
        break
      case 'Escape':
        if (e.target === this.overlayRef) {
          this.props.onCancel()
        } else {
          const targetIsDropdown = e.target.classList[0] === 'dropdown'
          const targetIsButton = e.target.tagName === 'BUTTON'

          if (targetIsDropdown || targetIsButton) {
            return this.props.onCancel()
          }

          e.target.blur()
          this.overlayRef.focus()
        }
        break
    }
  }

  private handleResetFocus = () => {
    this.overlayRef.focus()
  }

  private get isSaveable(): boolean {
    const {queriesWorkingDraft} = this.state

    return queriesWorkingDraft.every(
      (query: Query) =>
        (!!query.measurement && !!query.database && !!query.fields.length) ||
        !!query.rawText
    )
  }

  private get queryActions() {
    return {
      editRawTextAsync: this.handleEditRawText,
      ..._.mapValues(queryModifiers, this.queryStateReducer),
    }
  }

  private get sourceLink(): string {
    const {
      cell: {queries},
      source: {links},
    } = this.props
    return _.get(queries, '0.source.links.self', links.self)
  }

  private get source(): Source {
    const {source, sources} = this.props
    const query = _.get(this.state.queriesWorkingDraft, 0, {source: null})

    if (!query.source) {
      return source
    }

    return sources.find(s => s.links.self === query.source) || source
  }
}

export default CellEditorOverlay
