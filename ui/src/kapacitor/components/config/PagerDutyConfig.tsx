import React, {PureComponent} from 'react'
import RedactedInput from 'src/kapacitor/components/config/RedactedInput'
import {ErrorHandling} from 'src/shared/decorators/errors'

interface Properties {
  'service-key': string
  url: string
}

interface Config {
  options: {
    'service-key': boolean
    url: string
  }
}

interface Props {
  config: Config
  onSave: (properties: Properties) => void
  onTest: (event: React.MouseEvent<HTMLButtonElement>) => void
  enabled: boolean
}

interface State {
  testEnabled: boolean
}

@ErrorHandling
class PagerDutyConfig extends PureComponent<Props, State> {
  private serviceKey: HTMLInputElement
  private url: HTMLInputElement

  constructor(props) {
    super(props)
    this.state = {
      testEnabled: this.props.enabled,
    }
  }

  public render() {
    const {options} = this.props.config
    const {url} = options
    const serviceKey = options['service-key']
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group col-xs-12">
          <label htmlFor="service-key">Service Key</label>
          <RedactedInput
            defaultValue={serviceKey}
            id="service-key"
            refFunc={this.handleServiceKeyRef}
            disableTest={this.disableTest}
          />
        </div>

        <div className="form-group col-xs-12">
          <label htmlFor="url">PagerDuty URL</label>
          <input
            className="form-control"
            id="url"
            type="text"
            ref={r => (this.url = r)}
            defaultValue={url || ''}
            onChange={this.disableTest}
          />
        </div>

        <div className="form-group form-group-submit col-xs-12 text-center">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={this.state.testEnabled}
          >
            <span className="icon checkmark" />
            Save Changes
          </button>
          <button
            className="btn btn-primary"
            disabled={!this.state.testEnabled}
            onClick={this.props.onTest}
          >
            <span className="icon pulse-c" />
            Send Test Alert
          </button>
        </div>
      </form>
    )
  }

  private handleServiceKeyRef = r => (this.serviceKey = r)

  private handleSubmit = async e => {
    e.preventDefault()

    const properties = {
      'service-key': this.serviceKey.value,
      url: this.url.value,
    }

    const success = await this.props.onSave(properties)
    if (success) {
      this.setState({testEnabled: true})
    }
  }

  private disableTest = () => {
    this.setState({testEnabled: false})
  }
}

export default PagerDutyConfig
