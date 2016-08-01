# Mendix Data Grid Extension
The Mendix Data Grid Extension, Give the end user more flexibility how a grid should show data by giving the option to hide and move columns and allow them store there settings including column with and sort order.
Flex header column, With right click on the header shows a menu. This menu can be used to re-order the columns with drag and drop. Hide show columns. All changes including width and sort order are stored in the widget via HTML5 local storage. Hint give a column 0 width in the modeler and you can make it visible if need be with this feature.
Responsive visibly of columns; Columns are show or hidden based on the width of the browser window.
Dynamic Paging buttons are shown only when needed. When there is one page non is shown. When there are more then (n) pages the First Last button is shown.
Empty table allows to show a message with a button or just text when the table is not filled with any data. Optional you can hide the headers, make the interface more intuitive.
Control bar Button Visibility: In a table grid not all buttons can be used. This may be depending on the selected rows. When a row is selected the buttons that need a selection is shown. You can overwrite the behaviour with adding a styling class: ignoreRowSelectionVisibility hideOnRowSelect showOnRowSelect hideOnEmpty showOnEmpty
Content based Table Row Styling: The CSS class of a row in a table is changed based on the value of a columns. Booleans, enumerations and string can be used. When a column is made width of 0 it can be used for the styling but will not shown.

Demo Screen cast (Version 1)
https://www.youtube.com/watch?v=X6d0557bhkw

# Typical usage scenario
* Allow users to change to data displays in a data gird
* Store changes to column width, sort order, visible columns
* Responsive column hiding
* Hide paging buttons when not necessary
* Show a message when Data Grid is empty (text, link or button)
* Hide the table header when Data Grid is empty
* Content based Table Row Styling
* Control bar Button Visibility
* Have a micro flow button to select the next or pervious row of a grid.  

# Features and limitations
* Only for Mendix 5.18 and after
* Closely integrated with the data grid, future release may break
* Responsive columns (as in screen cast) can not used in combination with reorganizing headers.
* Flexible headers (hide columns) works only with Width units percentage.

# Installation
* See the general instructions under How to Install.
* Place the widget in a table under the a data grid
* Select on the tabs what functionality is needed (all function can independently switched on)

# Dependencies
* Mendix 5.18  Environment

# Configuration / Properties
## Grid Extention
* Columns
  * Responsive Columns (When true, the bootstrap responsive classes can be uses to show hide columns. Can not be used in combination with the hide an move headers)

* Paging
  * Hide Unused Paging (Hide Paging Buttons when there is no next page)
* Header
** Flex Header (When true, columns can Moved, store sort order and hidden. Can not be used in combination with responsive Columns)
* Empty Table
  * Render as (Show as a string, as a button or Link.)
  * On click Microflow (The microflow to execute on click of Empty Table message button or link.)
  * Caption (The text to display if the grid is empty.)
  * Image (Optional button that is shown in front of the label of the button.)
  * Hide Empty Table (Hide the table headers when the gird is empty)
* Tool bar
 * Hide Unusable Buttons (Buttons that depend on selections do no need to be shown when no selection is made. like edit, delete, Mf with params etc.)
* Row
  * Grid Entity (The entity of the same type as the data grid rows)
  * Row Class Attribute (The attribute to show as the name)
  * Class Mapping (When no mapping is made the values will be made into class names(removing special characters)
    * Key (Key of enumeration, boolean (true, false) or string)
    * CSS Class (Class to be added at the row if the key matching)   

## Data Grid Selection Step (Data Grid Selection Creates a Previous or Next Selection button. Usefull when having a listner Data View on a Grid)
* Behaviour
  * Direction (The direction of the selection of the grid item)
  * On click Microflow (The microflow to execute on click of button, move selection on returing true)
* Button
  * Caption (caption on the button)
  * Image (Image shown in button)
  * Display As (Render as link or as button)
  * Disable First Last Step (When first or last low is selected the button is disabled)
  * Button Style (style of button (no for links))
