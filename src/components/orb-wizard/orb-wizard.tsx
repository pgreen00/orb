import { Component, Event, EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';

@Component({
  tag: 'je-wizard',
  styleUrl: 'je-wizard.css',
  shadow: true,
})
export class JeWizard {
  @State() completedSteps: number[] = [];
  @State() currentStep = 0;
  @Prop() steps: { label: string, optional?: boolean }[] = [];
  @Event() stepChange: EventEmitter<number>;
  @Event() finish: EventEmitter<void>;

  @Watch('completedSteps')
  async onCompletedStepsChange() {
    const isComplete = this.steps.every((t, index) => t.optional || this.completedSteps.includes(index))
    if (isComplete) {
      this.finish.emit()
    }
  }

  @Watch('currentStep')
  onCurrentStepChange(newValue: number) {
    this.stepChange.emit(newValue);
  }

  @Method()
  async next() {
    if (this.currentStep < this.steps.length - 1) {
      this.completedSteps = [...this.completedSteps, this.currentStep]
      this.currentStep++;
    } else if (this.currentStep === this.steps.length - 1) {
      this.completedSteps = [...this.completedSteps, this.currentStep]
    }
  }

  @Method()
  async previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.completedSteps = this.completedSteps.filter(step => step !== this.currentStep)
    }
  }

  @Method()
  async skip() {
    if (this.currentStep < this.steps.length - 1 && this.canSkipCurrentStep()) {
      this.currentStep++;
    }
  }

  @Method()
  async reset() {
    this.currentStep = 0;
    this.completedSteps = [];
  }

  @Method()
  async canSkip() {
    return this.canSkipCurrentStep()
  }

  private canSkipCurrentStep = () => this.steps[this.currentStep]?.optional;

  render() {
    return (
      <Host data-can-skip={this.canSkipCurrentStep()} role='navigation'>
        {this.steps.map((step, index) => (
          <div aria-current={index == this.currentStep ? 'step' : 'false'} class={{ step: true, active: index === this.currentStep, completed: this.completedSteps.includes(index) }}>
            <div>
              <span class='label'>{step.label}</span>
              {step.optional && <span class='optional'>Optional</span>}
            </div>
          </div>
        ))}
      </Host>
    );
  }
}
