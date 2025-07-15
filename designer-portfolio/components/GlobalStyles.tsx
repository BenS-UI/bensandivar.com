import React from 'react';
import { createGlobalStyles } from '../styles/global';

const GlobalStyles = () => {
  const styles = createGlobalStyles();
  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
};

export default GlobalStyles;
