"use client";

import React from 'react';
import { TableOfContents } from './toc';

export function ClientTableOfContents({ content }: { content: string }) {
  return <TableOfContents content={content} />;
}
