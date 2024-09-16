import React, { FC } from "react";

type NewTabLinkProps = {
  children: React.ReactNode;
  href: string;
};

export const NewTabLink: FC<NewTabLinkProps> = (props) => {
  const { children, href, ...other } = props;
  return (
    <a target="_blank" rel="noreferrer" href={href} {...other}>
      {children}
    </a>
  );
};
