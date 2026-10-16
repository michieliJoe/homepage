import Container from "components/services/widget/container";

export default function Component({ service }) {
  const { label, href } = service.widget;
  if (
    typeof label !== "string" ||
    !label.trim() ||
    typeof href !== "string" ||
    !/^(https?:\/\/|\/(?!\/)|#)/i.test(href)
  ) {
    return <Container service={service} error={{ message: "Link widgets require a label and a valid href" }} />;
  }

  return (
    <Container service={service}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-theme-200/50 dark:bg-theme-900/20 hover:bg-theme-300/50 dark:hover:bg-theme-800/20 rounded-sm m-1 flex-1 flex items-center justify-center text-center p-1 text-sm service-block"
      >
        {label}
      </a>
    </Container>
  );
}
