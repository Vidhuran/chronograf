import React, {PureComponent} from 'react'
import SlideToggle from 'src/shared/components/SlideToggle'

import {OnChangeArg} from 'src/types/ifql'

interface Props {
  argKey: string
  value: boolean
  funcID: string
  expressionID: string
  onChangeArg: OnChangeArg
  onGenerateScript: () => void
}

class FuncArgBool extends PureComponent<Props> {
  public render() {
    return (
      <div>
        {this.props.argKey}:
        <SlideToggle active={this.props.value} onToggle={this.handleToggle} />
      </div>
    )
  }

  private handleToggle = (value: boolean): void => {
    const {argKey, funcID, expressionID, onChangeArg} = this.props
    onChangeArg({funcID, key: argKey, value, generate: true, expressionID})
  }
}

export default FuncArgBool
