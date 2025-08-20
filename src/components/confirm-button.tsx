"use client";

import * as React from "react";

type Props = {
  confirm: string;
  className?: string;
  children: React.ReactNode;
};

/** Use inside an existing <form>. Prevents submit unless confirmed. */
export default function ConfirmSubmitButton({ confirm, className, children }: Props) {
  const onClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (!window.confirm(confirm)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  return (
    <button type="submit" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
