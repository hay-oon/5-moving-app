import type { Meta, StoryObj } from "@storybook/react";
import TextField from "@/src/components/shared/components/text-field";

const meta: Meta<typeof TextField.Chat> = {
  title: "TextField",
  component: TextField.Chat,
  parameters: {
    docs: {
      description: {
        component: "A button component for shared use",
      },
    },
  },
  argTypes: {},
};

export default meta;

type Story = StoryObj<typeof TextField.Chat>;

export const chat: Story = {
  args: { content: "안녕하세요.", variant: "received" },
};
