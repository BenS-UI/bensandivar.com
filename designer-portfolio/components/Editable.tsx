import React, { useRef } from 'react';
import { get } from 'lodash-es';
import { useStore } from '../store';

type AllowedTags = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface EditableProps extends React.HTMLAttributes<HTMLElement> {
  path: string;
  as?: AllowedTags;
}

const Editable: React.FC<EditableProps> = ({
  path,
  as: Component = 'span',
  ...props
}) => {
  const isEditorActive = useStore((state) => state.isEditorActive);
  const content = useStore((state) => get(state.content, path));
  const updateContent = useStore((state) => state.updateContent);
  const elementRef = useRef<HTMLElement>(null);

  if (typeof content === 'undefined') {
    console.warn(`Editable component: path "${path}" not found in store.`);
    return null;
  }

  const handleBlur = () => {
    if (elementRef.current) {
      updateContent(path, elementRef.current.innerText);
    }
  };

  if (isEditorActive) {
    return (
      <Component
        {...props}
        ref={elementRef as any}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        data-editable-path={path}
      >
        {content}
      </Component>
    );
  }

  return <Component {...props}>{content}</Component>;
};

export default Editable;
