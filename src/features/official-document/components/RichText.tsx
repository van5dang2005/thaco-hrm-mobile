import { Text, type TextProps } from '@/shared/ui/Text';

import { boldRuns } from '../utils/text';

/** A sentence whose `**marked**` runs are bold (warnings that name people). */
export function RichText({ children, ...rest }: TextProps & { children: string }) {
  return (
    <Text {...rest}>
      {boldRuns(children).map((run, i) =>
        run.bold ? (
          <Text key={i} weight="bold" className={rest.className} style={rest.style}>
            {run.text}
          </Text>
        ) : (
          run.text
        ),
      )}
    </Text>
  );
}
