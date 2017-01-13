---
author: "biegal"
cover: /images/launch-go-in-aws-lambda-slack-slash-command-example.jpg
date: 2017-01-16T08:49:23+02:00
description: GO is often called 'language of the cloud'. Let's see how we can use it to utilize AWS Lambda and create Slack Slash command. It's easy and serverless ;)
title: Launch Go in AWS Lambda - Slack slash command example
type: post
---
There are so many things happening in the 'infrastructure' part of software development. In just few years, we've moved from a grey box under your boss' desk, through virtual machines, things like [Chef](https://www.chef.io/chef/), [Docker](https://www.docker.com/) to [Serverless Architectures](http://martinfowler.com/articles/serverless.html). 
As much as I don't like buzzwords, for me as a developer, the idea of not having too much concern about where my code is running is quite appealing. I can just focus on 'what' it's doing!
Let's see what this 'serverless' means in a nutshell:

> _Serverless architectures refer to applications that significantly depend on third-party services (knows as Backend as a Service or "BaaS") or on custom code that runs in ephemeral containers (Function as a Service or "FaaS"), the best known vendor host of which currently is AWS Lambda. By using these ideas, and by moving much behavior to the front end, such architectures remove the need for the traditional 'always on' server system sitting behind an application._  

So I can run my code without setting up servers, networking etc. and I don't need to pay for whole thing if it's not used! If you don't have customers yet, you don't need to pay. You don't need to think about fallback servers or how many servers you need to handle rising traffic, you just pay when you use it. That's a huge benefit, especially at the beginning of your road to success.
Moreover, that's also great fit for small things that could help your day-to-day life and are often not worth setting up a whole machine if it’s being used once or twice per day.
Such characteristic perfectly describes Slack slash commands. In HappyTeam we're using Slack extensively, both for internal communication and for communication with our clients (and if you follow our blog you should also know how to build Slack [bot already](http://happyteam.io/blog/2016/10/03/how-to-build-karma-slack-bot-in-elixir/)). 

Now we know what AWS Lambda is. The second ingredient is Go. Although AWS Lambda doesn't support Go yet, I fancy it a lot and try to use it anywhere I can :) 
So let's see how can we use Go to build a Slack command hosted on AWS Lambda!

## Install AWS CLI
AWS CLI will help us to communicate with AWS API from terminal and create lambda functions on the fly.
Firstly, we need python. I'm on OSX, so I'll just type:  
`brew install python`  
in my terminal.  
Then we need AWS CLI:  
`pip install awscli`  
Now setup AWS CLI with your credentials through:  
`aws configure`  
You can check if everything is fine via:  
`aws s3 ls`  
If no errors are thrown, we're good to go.

## Create role
We’re missing one more thing before rushing to the code - IAM Role for our lambda function.
Open up Roles section in [AWS console](https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles)
and create a new role named `lambda_basic_execution`.  
In the next step, select `AWS Lambda` as Role Type 

![](/images/post-go-aws-lambda/select_role_type.png)  

On `Attach Policy` screen check `AWSLambdaBasicExecutionRole` and click Next and then Create Role.  
Success!

## Create Lambda
Time for some coding.
I assume that you have Go installed already (you can find packages and install instructions for your system on official website [Downloads - The Go Programming Language](https://golang.org/dl/), version 1.7.4 is the latest stable at the time of writing this post). 
Create a new folder in your `GOPATH` like:
```
mkdir happy-slash-command
cd happy-slash-command
```

We will be using  [GitHub - xlab/go-lambda](https://github.com/xlab/go-lambda) project, to wrap up our GO code and execute on AWS Lambda (as it's not natively supported yet).
First get the package via:  
`go get github.com/xlab/go-lambda`  
Now spin up your favorite code editor and create new file called `happy-slash-command.go` with following content:
```
package happyteam

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/xlab/go-lambda/lambda"
)

var Handler = lambda.Use(lambda.HandlerFunc(happyHandler))

func happyHandler(event json.RawMessage, context *lambda.Context) []byte {
	buf := new(bytes.Buffer)
	fmt.Fprintf(buf, "Hello from %s", context.FunctionName)
	return buf.Bytes()
}
```

It's basically a hello world application for now but you can develop here whatever you want, from simple calculations, through webservice calls to get weather, image processing - you get the idea.
For now, we just need something basic, to prove it all works.  	

Now it's time to use the lib to create lambda function from our code.
Open up terminal and execute:
```
go-lambda create --name "happy-slack-lambda" --role arn:aws:iam::303182444347:role/lambda_basic_execution handler happy-slash-command
```

In other words, we want to create a lambda function named "happy-slack-lambda" that will use "lambda_basic_execution" role we've created earlier and as its code use handler function from `happy-slash-command` Go package.

If everything went fine, you should see a summary table in your console, and new lambda function should be visible on your AWS Console

![](/images/post-go-aws-lambda/lambda_ready.png)

Go on, click on the lambda name and use blue 'Test' button to see if it works:

![](/images/post-go-aws-lambda/lambda_test.png)

Yeey! We've got ourselves a lambda function!

## API Gateway
We've got functionality in place, time to make it available outside - we need to set up URL for our lambda.
Get back to your AWS console and open up `API Gateway` portal. Create new gateway and set its name:  

![](/images/post-go-aws-lambda/api_gateway_name.png)


In the configuration panel, create new GET method and set it up to use lambda that we've created (we need to select region and set lambda name).

You should get a similar diagram at this point:  

![](/images/post-go-aws-lambda/gateway_diagram.png)

You can test your integration with a blue test button on upper left.

Ok, now from Actions menu, select `Deploy API` entry and create a new stage.  

![](/images/post-go-aws-lambda/name_stage.png)

You should get your URL now!  

![](/images/post-go-aws-lambda/gateway_url.png)

You can check it with any tool, let’s use curl for example:
```
➜  src curl https://i77rrzo9rj.execute-api.eu-west-1.amazonaws.com/prod
"Hello from happy-slack-lambda"%
```

Looks like it's working!

Onto last step now

## Setup Slack Slash command
Open up https:<YOUR_SLACK_TEAM_NAME>.slack.com/apps in your browser and find 'Slash command' integration.
On the first screen give it a name, like:  

![](/images/post-go-aws-lambda/slack_command_name.png)

On the next screen you can tweak your slack command, give it a nice icon, change alias etc. For now, we will just paste URL that we've got from AWS API Gateway and set Method to GET  

![](/images/post-go-aws-lambda/slack_command_setting.png)

And we should be good to go here!
Open up your Slack and type `/happyhi` 
You should see  

![](/images/post-go-aws-lambda/result.png)

Full success :)
