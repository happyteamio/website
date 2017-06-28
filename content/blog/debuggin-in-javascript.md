---
title: 	"Debugging in JavaScript"
date: 	2017-06-27
description: "Based on my own experience in JavaScript I want to describe some methods which I have learned during my work: how to deal with the worst scenario - when something in the code doesn’t work as expected!"
author: "amarszalek"
type: post
cover: "/images/debugging-in-javascript.jpg"
aliases:
  - /blog/2017/06/27/debugging-in-javascript/
---

&nbsp;

Based on my own experience in JavaScript I want to describe some methods which I have learned during my work: how to deal with the worst scenario - when something in the code doesn't work as expected!

In this article you will find:

- **Console logs & alerts**
- **The** ***debugger*** **instruction**
- **Global objects and console tool**
- **Code minification**
- **Performance debugging - Chrome CPU profile chart**

**Remember: executing JavaScript in different environments may give you different results. It may happen because JavaScript runs in browsers, as additional execution script in standalone applications(e.g .Photoshop actions) or even in the Node.js environment as a server application.**

----------

&nbsp;
## **Console logs & alerts**

In my case the most popular instructions are console.log() and console.dir(). I start my debugging work with those two methods. In the case when I meet some broken functionality in my app I write something like that:


    console.log("Hello world"); //output Hello world

    var user = {name: "John", surname: "Doe"};
    console.log(user); //depends on environment. Check it yourself!
    console.dir(user); //depends on environment. Check it yourself!

    function doSomething(arg1, arg2) {
      console.dir(this);  //log current scope object
      console.dir(arguments); //log current function arguments
      //... more code
    }

    doSomething("arg1", "arg2");

    var doItNow = function() {
      console.log("Inside doItNow");
      return "sample result";
    };
    console.log("Before do it now");
    console.log("DoItNow result: " + doItNow());

Those instructions will output information about any parameters that you pass. I use them when:

- checking function params - **arguments** (line 9)
- checking current object scope - **this** (line 8)
- checking order of executing functions (line 19, 17)
- printing data, results, objects - investigating

Loging methods like **console.log()** and **console.dir()** behave quite differently in Firefox:

- **log** prints out a **toString** representation
- **dir** prints out a navigable tree

However, In Chrome **console.log()** most of the time also prints out navigable tree.

Sometimes you want to stop execution of code and print a message. In that case, I use an **alert** function. In browsers, it shows a popup with a message and stops the code because it works synchronously (you can achieve the same using the debugger feature, but more on that later).


    renderCircle() {
      renderShape();
      alert("shape rendered"); //exceution code will stop until close dialog window
      fillShapyByColor("blue");
    }

Alert instruction works synchronously in browsers. We can use them in the places when we expect some visual changes and check that everything goes fine.

----------

&nbsp;
## **The** ***debugger*** **i****nstruction**

When printing information in the console is not enough to resolve my problem I switch to heavier artillery - the ***debugger*** instruction.
If we put ***debugger;*** line somewhere in the code, program will stop in that line during execution.


    var calulator = {};

    calculator.add = function (arg1, arg2) {
      debugger; //code will stop at this line
      return arg1 + arg2;
    }

    var result = calculator.add(2+3);
    console.log(result);

Running above code doesn't stop at line 3 until we open developer window (keyboard shortcut F12 in most of the browsers). That action automatically turns on debugging mode of the browser.
From this moment on we are in business!
 

![](/images/post-debugging-in-javascript/consoleView.png)


The above picture is a sample view from Chrome debugger window. The code stopped at line 9 where the debugger instruction is. The sources panel on the left contains files loaded to the browser. In the center, we will see the opened files usually the one in which code stopped. Well, notice that the arguments at line 7 have assigned values from the moment when the code was stopped. On the right there is menu with debugging tools. I love the **Local** menu, where I have all variables in the current context and I can change the values during program pause ❗️


![](/images/post-debugging-in-javascript/consoleViewCalculator.png)


In above picture I’ve changed **arg1** and **arg2** values from **line 14**. **Console.log()** will print **355** instead of original code result**: 5**.
This tool gives a lot of possibilities to test code with different values. Even when data comes from different server or file you can stop the program and change the values during code execution.

The debugger is a powerful tool. If you don't use it, it's time to start doing that! But what with the code running on the server? In that case, you can get help from Visual Studio Code or WebStorm. These are my favourites, but there are more developer tools which can support you. Those two programs work almost the same in debug mode in Node.js environment. Bellow, you will find some pictures which show sample configuration files and debugger views.

Debugging JavaScript by Visual Studio Code in Node.js requires launch.json which describes how to start our program in debug mode.

*Visual Studio Code - run configuration: launch.json:*

![](/images/post-debugging-in-javascript/visualStudioCodeRunConfiguration.png)


*Visual Studio Code - debugger view:*

![](/images/post-debugging-in-javascript/visualStudioCodeDebuggerView.png)


In WebStorm environment we need to create Run/Debug configuration. Nothing easier…
&nbsp;

*WebStorm - run configuration for Node.js:*

![](/images/post-debugging-in-javascript/webStormRunConfiguration.png)


*WebStorm - run configuration for Node.js:*

![](/images/post-debugging-in-javascript/webStormDebuggerView.png)


Tools described above don't need the debugger instruction to stop at a particular line of code. All you need to do is to open source file and click left panel at a line which you want to investigate. Breakpoint should be created after that action. It's marked as a red circle. This method is much better than writing debugger instruction because you don't have to change source files. But don't forget about the debugger instruction. It may help sometimes... you never know.

Below is a screenshot from WebStorm program. We can manage our breakpoint to make debugging more pleasant.


![](/images/post-debugging-in-javascript/webStormBreakPoints.png)


I have just mentioned about the debugger tool. I can't imagine my work without it. I hope you too!

----------

&nbsp;
## **Global objects and console tool**

In JavaScript, it's easy to access global object or a property of main elements like **window** or **document**. While dealing with a huge project I have learned a trick to execute the methods by developer tool included in browsers - **Console**.
The first step is to assign the object to the global variable. For example:


    (function doItNow() {
      var calculator = {}; //it won't be available outside doItNow function

      calculator.add = function (arg1, arg2) {
        return arg1 + arg2;
      }
      _calculator = calculator; //asign calculator to global object for debugging purpose
    })();

After that, I open the console window in the browser and test cases which interest me.

*Sample global variable usage:*

![](/images/post-debugging-in-javascript/calculatorSample.png)


Of course I remove global variables before release. They are very useful during testing but I don't leave it in the production code! I often use this trick in angular controllers for executing code on demand from the console.


    myApp.controller('CalculatorController', ['$scope', function($scope) {

      window._calculatorCtrl = this;        //assign object to global element
      window._calculatorCtrlScope = $scope; //assign object to global element

      $scope.sum = 0;

      $scope.add = function(value) {
          $scope.sum += value;
      };

      this.reset = function() {
          $scope.sum = 0;
      };

    }]);


*Sample usage of variables assignment by console:*

![](/images/post-debugging-in-javascript/angularControllerSample.png)


Obviously, I have to remember about removing testing assignment before commiting the code❗️ To avoid publishing that code I have created those variables with underscore suffix and run ESLint with the no-underscore-dangle option enabled before committing changes.

----------

&nbsp;
## **Code minification**

A problem with debugging in JavaScript starts when we leave our comfort zone and our local developer server. In the production version of our application, we use minified code to improve performance. The easiest way to reproduce the error locally is by debugging the original unminified code. But sometimes it may be impossible. One known solution is to making source maps during code compilation. Chrome or Firefox have built-in options to support source maps. Those browsers can use them to decompile minified code and back to its original position in a source file. Otherwise, if source map is not available I know only one method to work with the compressed code - 'Pretty print'. You can find it in Chrome developer window, in sources tab, at the bottom of the screen.

*Source file before "Pretty print":*

![](/images/post-debugging-in-javascript/prettyPrintBefore.png)


*Source file after "Pretty print":*

![](/images/post-debugging-in-javascript/prettyPrintAfter.png)


The effect of that manipulation is not shocking but it's more readable than it was before. Additionally, we gain the ability to debug the source line by line! Good luck :)

----------

&nbsp;
## **Performance debugging - Chrome CPU profile chart**

Sometimes everything works as expected but it's very slow... Without proper tool, we might have to analyse timespan between methods execution. Luckily, Chrome CPU profile chart comes to the rescue. I have discovered this tool recently but I have already appreciated its usefulness.

Let me show you an example. Let's assume the code below, will execute on page load.


    (function doItNow() {

      function longProcess() {
        for(var i = 0; i < 500000000; i++) {}
      }

      function shortProcess() {
        for(var i = 0; i < 200000000; i++) {}
      }

      function parentProcess() {
        longProcess();
        for(var i = 0; i < 100000000; i++) {}; //do something long inside funcion
        shortProcess();
      }

      longProcess();
      shortProcess();
      longProcess();

      for(var i = 0; i < 200000000; i++) {}; //do something long inside funcion
      parentProcess();
    })();

How to check where the code spent most of the time for processing? It's not hard at all…

1. open Chrome browser
2. open developer window (`F12`)
3. move to  `Profiles` tab
4. from left menu, click on `Start CPU profiling`
5. force browser to execute our code (in this case re-load page)
6. after code execution, stop profiling


*Result chart for sample test:*

![](/images/post-debugging-in-javascript/flameChartSample.png)


As we can expect, all of the time is taken by the **doItNow** ****function which is understandable because we run only that code in the test period. In the chart, we can observe differences between **longProcess** and **shortProcess** which are invoked directly from **doItNow**. This tool is very user-friendly, after mouse over at some block we receive more details about executed function.


![](/images/post-debugging-in-javascript/flameChartMouseOver.png)


It's a really powerful tool, I owe my few urgent code improvements to it. I recommend you give it a go and get your own opinion.

----------
# Summary

Those are my own debugging style and tools. Remember that in the code you will not find magic. The code will run step by step and with the debugger you can check its every line!
Good luck!