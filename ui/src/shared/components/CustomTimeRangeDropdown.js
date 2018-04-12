import React, {Component} from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import classnames from 'classnames'
import OnClickOutside from 'react-onclickoutside'

import CustomTimeRange from 'shared/components/CustomTimeRange'

class CustomTimeRangeDropdown extends Component {
  constructor(props) {
    super(props)

    this.state = {
      expanded: false,
    }
  }

  handleClickOutside() {
    this.handleCloseDropdown()
  }

  handleToggleDropdown = () => {
    this.setState({expanded: !this.state.expanded})
  }

  handleCloseDropdown = () => {
    this.setState({expanded: false})
  }

  render() {
    const {
      timeRange: {upper, lower},
      timeRange,
      onApplyTimeRange,
    } = this.props

    const {expanded} = this.state

    return (
      <div
        className={classnames('dropdown dropdown-280 custom-time-range', {
          open: expanded,
        })}
      >
        <button
          className="btn btn-sm btn-default dropdown-toggle"
          onClick={this.handleToggleDropdown}
        >
          <span className="icon clock" />
          <span className="dropdown-selected">{`${moment(lower).format(
            'MMM Do HH:mm'
          )} — ${moment(upper).format('MMM Do HH:mm')}`}</span>
          <span className="caret" />
        </button>
        <CustomTimeRange
          onApplyTimeRange={onApplyTimeRange}
          timeRange={timeRange}
          onClose={this.handleCloseDropdown}
        />
      </div>
    )
  }
}

const {func, shape, string} = PropTypes

CustomTimeRangeDropdown.propTypes = {
  onApplyTimeRange: func.isRequired,
  timeRange: shape({
    lower: string.isRequired,
    upper: string,
  }).isRequired,
}

export default OnClickOutside(CustomTimeRangeDropdown)
