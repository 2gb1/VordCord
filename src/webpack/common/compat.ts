import { Button as NewButton } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { BaseText } from "@components/BaseText";
import { React } from "@webpack/common";

export const Button: any = Object.assign((props: any) => React.createElement(NewButton as any, props), {
    Colors: { BRAND: "primary", PRIMARY: "primary", RED: "dangerPrimary", GREEN: "positive", TRANSPARENT: "secondary", LINK: "link", CUSTOM: "primary", WHITE: "secondary" },
    Looks: { FILLED: "filled", LINK: "link", BLANK: "blank", OUTLINED: "outlined" },
    Sizes: { NONE: "none", TINY: "min", SMALL: "small", MEDIUM: "medium", LARGE: "large", XLARGE: "xlarge", MIN: "min", MAX: "max", ICON: "icon" }
});
export const Text: any = (props: any) => React.createElement(BaseText as any, props);

export const HeadingSecondary: any = (props: any) => React.createElement(Heading as any, { tag: "h2", ...props });
export const HeadingTertiary: any = (props: any) => React.createElement(Heading as any, { tag: "h3", ...props });

export const Forms: any = {
    FormTitle: (props: any) => React.createElement(Heading as any, { tag: props.tag ?? "h5", ...props }),
    FormText: (props: any) => React.createElement(Paragraph as any, props),
    FormSection: (props: any) => React.createElement("section", props),
    FormDivider: () => React.createElement("hr"),
};
