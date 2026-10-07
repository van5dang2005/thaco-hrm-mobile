import { act, create, type ReactTestInstance } from 'react-test-renderer';

import { StepperBar, type StepNumber } from '../StepperBar';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/core/theme/ThemeProvider', () => ({ useTheme: () => ({ colors: { header: '#00539B' }, scheme: 'light' }) }));
jest.mock('@/core/theme/fontStore', () => ({ useFontStyle: () => ({}) }));
jest.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/shared/ui/icons', () => ({ CheckIcon: () => null }));

const setup = (current: StepNumber) => {
  const onStepPress = jest.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<StepperBar current={current} onStepPress={onStepPress} />);
  });
  const step = (n: number): ReactTestInstance => tree.root.findByProps({ testID: `stepper-${n}` });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => node.children.join(''));
  const press = (n: number) => {
    const node = step(n);
    // A disabled Pressable does not fire onPress.
    if (!node.props.accessibilityState.disabled) act(() => node.props.onClick?.() ?? node.props.onPress?.());
  };
  return { step, texts, press, onStepPress };
};

describe('StepperBar', () => {
  it('marks the current step selected and only finished steps pressable', () => {
    const { step } = setup(3);
    const state = (n: number) => step(n).props.accessibilityState;
    expect(state(1)).toEqual({ selected: false, disabled: false });
    expect(state(2)).toEqual({ selected: false, disabled: false });
    expect(state(3)).toEqual({ selected: true, disabled: true });
    expect(state(4)).toEqual({ selected: false, disabled: true });
  });

  it('calls onStepPress when a finished step is pressed', () => {
    const { press, onStepPress } = setup(3);
    press(2);
    expect(onStepPress).toHaveBeenCalledWith(2);
  });

  it('ignores the current and upcoming steps', () => {
    const { press, onStepPress } = setup(2);
    press(2);
    press(4);
    expect(onStepPress).not.toHaveBeenCalled();
  });

  it('shows the number for current and upcoming steps, a check for finished ones, and the i18n labels', () => {
    const { texts } = setup(2);
    const all = texts();
    expect(all).not.toContain('1');
    expect(all).toEqual(expect.arrayContaining(['2', '3', '4']));
    for (const key of ['room', 'time', 'details', 'confirm']) expect(all).toContain(`booking.steps.${key}`);
  });
});
