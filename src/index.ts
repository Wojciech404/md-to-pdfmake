global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

import marked from 'marked';
import { JSDOM } from 'jsdom';

import {
  Content,
  ContentOrderedList,
  ContentText,
  ContentUnorderedList,
} from 'pdfmake/interfaces';
import { FontStyle, Style } from './types';

export const toPdfMakeObject = (md: string, style: Style = {}): Content[] => {
  function buildText(text: string | null, options = {}): ContentText {
    return { text: text || '', ...options };
  }

  function buildItalics(element: Element): ContentText {
    if (element.childElementCount) {
      const value = {
        text: Array.from(element.childNodes).map(element => {
          if ((<Element>element).tagName === undefined) {
            return buildText(element.textContent, {
              italics: true,
            });
          }

          if ((<Element>element).tagName === 'A') {
            return buildText(element.textContent, {
              italics: true,
              link: (<HTMLAnchorElement>element).href,
              ...style.a,
            });
          }

          if ((<Element>element).tagName === 'STRONG') {
            return buildText(element.textContent, {
              bold: true,
              italics: true,
            });
          }

          return buildContent(<Element>element);
        }),
      }

      return value;
    }
    
    return buildText(element.textContent, { italics: true });
  }

  function buildBold(element: Element): ContentText {
    if (element.childElementCount) {
      const value = {
        text: Array.from(element.childNodes).map(element => {
          if ((<Element>element).tagName === undefined) {
            return buildText(element.textContent, {
              bold: true,
            });
          }

          if ((<Element>element).tagName === 'A') {
            return buildText(element.textContent, {
              bold: true,
              link: (<HTMLAnchorElement>element).href,
              ...style.a,
            });
          }

          if ((<Element>element).tagName === 'EM') {
            return buildText(element.textContent, {
              bold: true,
              italics: true,
            });
          }

          return buildContent(<Element>element);
        }),
      }
      
      return value;
    }

    return buildText(element.textContent, { bold: true });
  }

  function buildAnchor(element: Element): ContentText {
    return buildText(element.textContent, {
      link: (<HTMLAnchorElement>element).href,
      ...style.a
    });
  }
  
  function buildBlock(element: Element, styles?: FontStyle): ContentText | Content[] {
    if (element.childElementCount) {
      return {
        text: Array.from(element.childNodes).map(element => {
          if ((<Element>element).tagName === undefined) {
            return buildText(element.textContent);
          }

          return buildContent(<Element>element);
        }),
        ...(styles || {}),
      };
    }
    return buildText(element.textContent, styles || {});
  }
  
  function buildBlockFactory(styles?: FontStyle): (element: Element) => ContentText | Content[] {
    return (element: Element): ContentText | Content[] => buildBlock(element, styles);
  }

  function buildListItem(element: Element): ContentText | Content[] {
    if (element.childElementCount) {
      return Array.from(element.children).map(child => buildContent(child));
    }

    return buildText(element.textContent, style.li || {});
  }

  function buildUnorderedList(element: Element): ContentUnorderedList {
    return {
      ul: Array.from(element.children).map(child => buildContent(child)),
      ...style.ul,
    };
  }

  function buildOrderedList(element: Element): ContentOrderedList {
    return {
      ol: Array.from(element.children).map(child => buildContent(child)),
      ...style.ol,
    };
  }

  function buildMethod(
    htmlTagName: string
  ): (element: Element) => Content | Content[] {
    const notFoundBuildMethod = () => [] as Content;
    const buildMethodMap: {
      [key: string]: (element: Element) => Content | Content[];
    } = {
      A: buildAnchor,
      P: buildBlockFactory(style.p),
      UL: buildUnorderedList,
      LI: buildListItem,
      OL: buildOrderedList,
      H1: buildBlockFactory(style.h1),
      H2: buildBlockFactory(style.h2),
      H3: buildBlockFactory(style.h3),
      H4: buildBlockFactory(style.h4),
      H5: buildBlockFactory(style.h5),
      H6: buildBlockFactory(style.h6),
      STRONG: buildBold,
      EM: buildItalics,
    };
    return buildMethodMap[htmlTagName] || notFoundBuildMethod;
  }

  function buildContent(element: Element): Content {
    return buildMethod(element.tagName)(element);
  }

  function htmlElements(): Element[] {
    return Array.from(new JSDOM(marked(md)).window.document.body.children);
  }

  const returnContent = htmlElements().map(element => buildContent(element));
  return returnContent;
};
