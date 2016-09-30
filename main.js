/*
 * Licenced under MIT
 * Author: Wang Yu <bigeyex@gmail.com>
 * github: https://github.com/bigeyex/brackets-wordhint
*/

/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    "use strict";

    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        LanguageManager     = brackets.getModule("language/LanguageManager");
    
    var lastLine,
        lastFileName,
        cachedMatches,
        cachedWordList,
        tokenDefinition,
        currentTokenDefinition;
       // CSSProperties       = require("text!CSSProperties.json"),
       // properties          = JSON.parse(CSSProperties);
    
    /**
     * @constructor
     */
    function WordHints() {
        this.lastLine = 0;
        this.lastFileName = "";
        this.cachedMatches = [];
        this.cachedWordList = [];
        this.tokenDefinition = /[\$a-zA-Z][\-a-zA-Z0-9_]*[a-zA-Z0-9_]+/g;
        this.currentTokenDefinition = /[\$a-zA-Z]+$/g;
    }
    
    
    /**
     * 
     * @param {Editor} editor 
     * A non-null editor object for the active window.
     *
     * @param {String} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {Boolean} 
     * Determines whether the current provider is able to provide hints for
     * the given editor context and, in case implicitChar is non- null,
     * whether it is appropriate to do so.
     */
    WordHints.prototype.hasHints = function (editor, implicitChar) {
        this.editor = editor;
        var cursor = this.editor.getCursorPos();
        
        // if it is not the same line as the last input - rebuild word list
        if(cursor.line != this.lastLine){
            var rawWordList = editor.document.getText().match(this.tokenDefinition);
            this.cachedWordList = [];
            for(var i in rawWordList){
               var word = rawWordList[i]; 
               if(!this.cachedWordList.find(function(item) { return item.toLowerCase().indexOf(word.toLowerCase())>=0 } )){
                   this.cachedWordList.push(word);
               }
            }
        }
        this.lastLine = cursor.line;
        
        // if has entered more than 1 characters - start completion
        var lineBeginning = {line:cursor.line,ch:0};
        var textBeforeCursor = this.editor.document.getRange(lineBeginning, cursor);
        var symbolBeforeCursorArray = textBeforeCursor.match(this.currentTokenDefinition);
        if(symbolBeforeCursorArray){
            // find if the half-word inputed is in the list
            for(var i in this.cachedWordList){
                if(this.cachedWordList[i].toLowerCase().indexOf(symbolBeforeCursorArray[0].toLowerCase())==0){
                    return true;  
                }
            }
        }
        
        
        return false;
    };
       
    /**
     * Returns a list of availble CSS propertyname or -value hints if possible for the current
     * editor context. 
     * 
     * @param {Editor} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {jQuery.Deferred|{
     *              hints: Array.<string|jQueryObject>,
     *              match: string,
     *              selectInitial: boolean,
     *              handleWideResults: boolean}}
     * Null if the provider wishes to end the hinting session. Otherwise, a
     * response object that provides:
     * 1. a sorted array hints that consists of strings
     * 2. a string match that is used by the manager to emphasize matching
     *    substrings when rendering the hint list
     * 3. a boolean that indicates whether the first result, if one exists,
     *    should be selected by default in the hint list window.
     * 4. handleWideResults, a boolean (or undefined) that indicates whether
     *    to allow result string to stretch width of display.
     */
    WordHints.prototype.getHints = function (implicitChar) {
        var cursor = this.editor.getCursorPos();
        var lineBeginning = {line:cursor.line,ch:0};
        var textBeforeCursor = this.editor.document.getRange(lineBeginning, cursor);
        var symbolBeforeCursorArray = textBeforeCursor.match(this.currentTokenDefinition);
        var hintList = [];
        if(symbolBeforeCursorArray === null) return null;
        if(cachedWordList === null) return null;
        for(var i in this.cachedWordList){
            if(this.cachedWordList[i].toLowerCase().indexOf(symbolBeforeCursorArray[0].toLowerCase())==0){
                hintList.push(this.cachedWordList[i]);
            }
        }

        return {
            hints: hintList,
            match: symbolBeforeCursorArray[0],
            selectInitial: true,
            handleWideResults: false
        };
    };
    
    /**
     * Complete the word
     * 
     * @param {String} hint 
     * The hint to be inserted into the editor context.
     * 
     * @return {Boolean} 
     * Indicates whether the manager should follow hint insertion with an
     * additional explicit hint request.
     */
    WordHints.prototype.insertHint = function (hint) {
        var cursor = this.editor.getCursorPos();
        var lineBeginning = {line:cursor.line,ch:0};
        var textBeforeCursor = this.editor.document.getRange(lineBeginning, cursor);
        var indexOfTheSymbol = textBeforeCursor.search(this.currentTokenDefinition);
        var replaceStart = {line:cursor.line,ch:indexOfTheSymbol};
        if(indexOfTheSymbol == -1) return false;
        this.editor.document.replaceRange(hint, replaceStart, cursor);
        console.log("hint: "+hint+" | lineBeginning: "+lineBeginning.line+', '+lineBeginning.ch+" | textBeforeCursor: "+textBeforeCursor+" | indexOfTheSymbol: "+indexOfTheSymbol+" | replaceStart: "+replaceStart.line+', '+replaceStart.ch);
        
        return false;
    };
    
    AppInit.appReady(function () {
        var wordHints = new WordHints();
        CodeHintManager.registerHintProvider(wordHints, ["all"], 0);
    });
});
