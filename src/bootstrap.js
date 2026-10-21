"use strict";
// Start only after every feature file has registered its controls.
newDoc(1200, 800, false);
setTool("move");
initialiseRecovery().finally(() => {
  initialiseDesktop();
});
