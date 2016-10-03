---
author: "eldhash"
cover: /images/how-to-build-karma-slack-bot-in-elixir.png
date: 2016-09-22T18:49:23+02:00
description: Elixir is a young, exciting language with rapidly growing community. Let's use it to create Slack bot, which is a cool addition to the feedback in your team.
title: How to build karma Slack bot in Elixir
type: post
---

What constant feedback, working remotely and self-improvement have in common? These are the values we hold dear at HappyTeam. A few years ago, when we were using HipChat for async communication, we discovered a nice bot called [karma](https://bitbucket.org/atlassianlabs/ac-koa-hipchat-karma). It was a cool add-on to our feedback culture, allowing us to give each other "karma points". These points could be later used while voting for Sprint MVP for instance ([See mihcall's blog post for more details about Sprint MVP](http://blog.mihcall.com/2014/12/21/A-recipe-for-a-happy-software-development-team/)).
When we moved to Slack, which doesn't have anything similar out-of-the box, we missed this feature a lot. There were a few third party plugins (both proprietary and open source) but most of them had some drawbacks. 
I thought that this might be a great opportunity to write such a bot myself in a language that I've been learning for some time and felt very enthusiastic about. This language was Elixir. I chose it because it was something outside of my everyday .NET world, something fresh, multiplatform, functional.

In this post I'll show you how to build a Slack bot in Elixir. For readers who are starting their adventure with Elixir I explained some of the constructs and provided links to appropriate Elixir's guide pages.

Features
--

The bot will support 3 functions:

* **assign karma** - by sending a message with one or more mentions followed by appropriate number of plus (or minus) signs to add to (or to subtract from) the current number of karma points for mentioned user. Eg. `thanks @mike ++ for help`. Pluses/minuses work like the increment/decrement operators from C, i.e. `++` increments karma by one. The maximum value of which karma can be changed is five.
* **show karma** - by talking directly to the bot (private message) or by mentioning bot's name in one of the channels (optionally followed by the string `info`) to see the current points for each user.
* **reset karma** - by typing `reset` after bot's mention (eg. `@elkarmo reset`) in one of the channels to set all points to 0.

Creating a simple Slack bot
--

Assuming that Elixir 1.3 or greater is [installed on your machine](http://elixir-lang.org/install.html) start a new project with [mix](http://elixir-lang.org/getting-started/mix-otp/introduction-to-mix.html):

```
$ mix new elkarmo
$ cd elkarmo
```

You cannot use a simple [slash command](https://api.slack.com/slash-commands), because the bot must receive all the messages in a channel and parse them to look for correct karma assignment messages. To do this, you have to use Slack [Real Time Messaging API](https://api.slack.com/rtm). Fortunately, there's [Elixir-Slack](https://github.com/BlakeWilliams/Elixir-Slack) library, which makes interaction with Slack RTM API much easier. Add this library (and its dependencies) to your project, by adding it to `deps` list inside `mix.exs` file:

```
defp deps do
  [
    {:slack, "~> 0.7.0"},
    {:websocket_client, git: "https://github.com/jeremyong/websocket_client"}
  ]
end
```

You must also update [applications list](http://elixir-lang.org/getting-started/mix-otp/supervisor-and-application.html#understanding-applications) to include newly added apps:

```
def application do
  [applications: [:logger, :websocket_client, :slack]]
end
```

Now get and compile them with the following command:

```
$ mix do deps.get, deps.compile
```

Time to create a new [Slack bot](https://api.slack.com/bot-users). The easiest way is to visit [this link](https://my.slack.com/services/new/bot). Fill in bot's name (eg. _elkarmo_) and click _Add bot integration_. You will be redirected to the bot customization page. You can change name, avatar, etc. The most important thing right now is *API Token* - you will need it to connect your bot to Slack.

Next thing to do is to implement a simple message handler. Inside _elkarmo_ project, create a file `lib/elkarmo/slack.ex` (you have to create `lib/elkarmo` directory) with the following contents:

```
defmodule Elkarmo.Slack do
  use Slack

  def handle_connect(slack) do
    IO.puts "Connected as #{slack.me.name}"
  end

  def handle_message(_message = %{type: "message", subtype: _}, _slack), do: :ok

  # ignore reply_to messages
  def handle_message(_message = %{type: "message", reply_to: _}, _slack), do: :ok

  def handle_message(message = %{type: "message"}, slack) do
    say_hello(message, slack)
  end

  def handle_message(_message, _slack), do: :ok

  defp say_hello(%{channel: channel}, slack) do
    send_message("Hello from elkarmo", channel, slack)
    :ok
  end
end
```

Handler functions `handle_connect` & `handle_message` come from *Elixir-Slack* library. Elixir pattern matching is used on function `handle_message` to ignore messages containing either `subtype` (various event messages, eg. channel join) or `reply_to` (happens usually after reconnect) fields. After that, comes the actual handler, which right now only sends _Hello from elkarmo_ message. Last handler is used to catch any possible events (eg. reactions). Without it, your app might crash because it wouldn't be able to find appropriate handler. Symbol `:ok` is used as the return value to all functions, cause it's a common convention in OTP to denote that everything went fine and the processing should continue.
`slack` parameter is the "context" of current Slack session, which contains various interesting information like the list of channels, users, etc.

Testing the bot in iex
--

Start Elixir's interactive shell [iex](http://elixir-lang.org/docs/master/iex/IEx.html) and load elkarmo. To do this, run the following command from the project's root directory:

```
$ iex -S mix
```

You should see iex prompt. Time to start your handler (remember about the token):

```
iex(1)> Elkarmo.Slack.start_link("PASTE-THE-SLACK-API-TOKEN-HERE")
Connected as elkarmo
{:ok, #PID<0.205.0>} <-- PID can vary
```

Go to Slack, invite the newly created bot to one of the channels and send a message. The bot should reply:

![elkarmo](/images/elkarmo01.png)

_To exit iex press Ctrl+C twice_

Identifying direct messages
--

Depending on the channel of your interaction with the bot (private or public), various functions are enabled. For private messages you only show karma, while for public messages you have to parse their contents.

Check for private messages by adding the following function to _slack.ex_:

```
defp is_direct_message?(%{channel: channel}, slack), do: Map.has_key? slack.ims, channel
```

The code above extracts channel from map given in the first parameter (again, thanks to pattern matching) and checks if that channel is the [im message channel](https://api.slack.com/methods/im.list) by looking for its presence in the list of direct channels (`slack.ims`). Method name ends with a question mark to denote that is returns a boolean (convention common in Ruby).

Having knowledge of message type, change (only) the main handler to the following:

```
def handle_message(message = %{type: "message"}, slack) do
  if not is_direct_message?(message, slack) do
    # TODO: add parsing
    say_hello(message, slack)
  else
    show_karma(message, slack)
  end
end
```
and add a new function at the end:
```
defp show_karma(%{channel: channel}, slack) do
  send_message("Showing karma", channel, slack)
  :ok
end
```

You can test the bot using iex as described earlier.

Parsing messages
--

_Please note that inside RTM API, the messages don't look the same as in GUI client, instead of mentions, user ids are used. So, if someone sends "Hi @jack!" message, you will receive it as something similar to "Hi <@U07A2APBP>", where "U07A2APBP" is the user's id._

For different types of operations supported, parser will return appropriate [atom](http://elixir-lang.org/getting-started/basic-types.html#atoms):

* for info requests (empty bot mention or followed by _info_) return `:info` atom.
* for reset requests (bot mention followed by _reset_) return `:reset` atom.
* for karma assignments (user(s) mention followed by two or more plus/minus signs) return two-element tuple: `{:update, list_of_karmas}`, where `list_of_karmas` is a list of two-element tuples in the form `{user_id, score}`.
* otherwise return `nil`.

Time to implement these requirements as unit tests. Go to project's root directory and create a new file: `test/elkarmo/parser_test.exs`. Extension `exs` denotes that this is Elixir script file, which is directly executed by the interpreter (without compiling). Here are the tests:

```
defmodule Elkarmo.ParserTest do
  use ExUnit.Case, async: true
  alias Elkarmo.Parser, as: Parser
  
  @my_id "U1J28HCKC"

  test "info" do
    assert Parser.parse("<@#{@my_id}>", @my_id) == :info
    assert Parser.parse("<@#{@my_id}>:", @my_id) == :info
    assert Parser.parse("<@#{@my_id}>: ", @my_id) == :info
    assert Parser.parse("<@#{@my_id}> info", @my_id) == :info
    assert Parser.parse("<@#{@my_id}>:info", @my_id) == :info
    assert Parser.parse("<@#{@my_id}>: info", @my_id) == :info
  end

  test "reset" do
    assert Parser.parse("<@#{@my_id}> reset", @my_id) == :reset
    assert Parser.parse("<@#{@my_id}>:reset", @my_id) == :reset
    assert Parser.parse("<@#{@my_id}>: reset", @my_id) == :reset
  end

  test "update" do
    expected = {:update, [{"U174NDB8F", 1}]}
    assert Parser.parse("<@U174NDB8F>: ++", @my_id) == expected
    assert Parser.parse("<@#{@my_id}> <@U174NDB8F>: ++", @my_id) == expected
    assert Parser.parse("<@#{@my_id}>:<@U174NDB8F>: ++", @my_id) == expected
    assert Parser.parse("<@#{@my_id}>: <@U174NDB8F>: ++", @my_id) == expected
  end

  test "other message" do
    assert Parser.parse("<@#{@my_id}>: informations", @my_id) == nil
    assert Parser.parse("<@#{@my_id}>: resetting", @my_id) == nil
    assert Parser.parse("<@#{@my_id}>: <@U174NDB8F>: +", @my_id) == nil
    assert Parser.parse("<@U174NDB8F>: +", @my_id) == nil
  end
  
  test "message with no karma" do
    assert Parser.extract_karma("") == []
    assert Parser.extract_karma("<@U07A2APBP>: hey") == []
    assert Parser.extract_karma("<@U07A2APBP>: +--") == []
  end

  test "simple ++" do
    expected = [{"U174NDB8F", 1}]
    assert Parser.extract_karma("<@U174NDB8F>: ++") == expected
    assert Parser.extract_karma("<@U174NDB8F> ++") == expected
    assert Parser.extract_karma("<@U174NDB8F>++") == expected
  end

  test "simple --" do
    expected = [{"U174NDB8F", -1}]
    assert Parser.extract_karma("<@U174NDB8F>: --") == expected
    assert Parser.extract_karma("<@U174NDB8F> --") == expected
    assert Parser.extract_karma("<@U174NDB8F>--") == expected
  end

  test "higher values" do
    assert Parser.extract_karma("<@U174NDB8F>: +++++") == [{"U174NDB8F", 4}]
    assert Parser.extract_karma("<@U174NDB8F>: -----") == [{"U174NDB8F", -4}]
  end

  test "limit very high values to 5" do
    assert Parser.extract_karma("<@U174NDB8F>: ++++++++++++++++++++++") == [{"U174NDB8F", 5}]
    assert Parser.extract_karma("<@U174NDB8F>: ----------------------") == [{"U174NDB8F", -5}]
  end

  test "multiple occurrences" do
    assert Parser.extract_karma("I'll give <@U174NDB8F>: +++++ and for <@U07A2APBP>---") == [{"U174NDB8F", 4}, {"U07A2APBP", -2}]
  end
end
```

For some explanation: `@my_id` is a [module attribute](http://elixir-lang.org/getting-started/module-attributes.html), similar to constants in other languages. Here, it is used together with [string interpolation](http://elixir-lang.org/getting-started/basic-types.html#strings) to represent the bot's id. Eg. `"<@#{@my_id}> reset"` turns into `"<@U1J28HCKC> reset"`.

Run the tests with the following command from project's root directory:
```
$ mix test
```

They're all failing cause there's no parser yet! Create it under `lib/elkarmo/parser.ex` and insert the following code:

```
defmodule Elkarmo.Parser do
  @karma_regex ~R/<@(\w+)>:?\s*(-{2,6}|\+{2,6})/

  def parse(message, my_id) do
    cond do
      message =~ ~r/^\s*<@#{my_id}>:?\s*(?:info)?\s*$/ -> :info
      message =~ ~r/^\s*<@#{my_id}>(?::?\s*|\s+)reset\s*$/ -> :reset
      true -> 
        case extract_karma(message) do
          [] -> nil
          karma -> {:update, karma}
        end
    end
  end

  def extract_karma(message) do
    for [_match, user, karma] <- Regex.scan(@karma_regex, message),
      do: {user, karma_value(karma)}
  end

  defp karma_value("+" <> pluses), do: String.length pluses
  defp karma_value("-" <> minuses), do: -(String.length minuses)
end
```

There're some interesting constructs inside `parse` function. First, there's [_cond_](http://elixir-lang.org/getting-started/case-cond-and-if.html#cond) block which evaluates a series of conditions and returns the first one which is _true_. The first two lines are matching message contents against the [regular expression sigils](http://elixir-lang.org/getting-started/sigils.html#regular-expressions) to check for `info` and `reset` commands. If neither branch matches, then the _default_ branch is executed, which calls `extract_karma` function and returns `nil` or `:update` tuple depending on the result.

In `extract_karma` there's another interesting Elixir construct, `for` aka [comprehension](http://elixir-lang.org/getting-started/comprehensions.html). `Regex.scan` here is the _generator_ and produces the list of three-element regex matches. Each match is then decomposed into `_match` (ignored), `user` and `karma`. The last two are used to create a tuple `{user, points}`.

To calculate `karma_value`, the concatenation operator (`<>`) is used to match against a series of plus/minus signs. The first sign is extracted so all that's left to do is to calculate the length of remaining string. _Remember that `++` equals 1 karma point and `--` equals -1_.

Run the tests again (`mix test`) to ensure everything works fine.

Now you can update main `handle_messages` in `slack.ex` to make use of your new parser:

```
def handle_message(message = %{type: "message"}, slack) do
  if not is_direct_message?(message, slack) do
    case Elkarmo.Parser.parse(message.text, slack.me.id) do
      :info -> show_karma(message, slack)
      :reset -> reset_karma(message, slack)
      {:update, changes} -> update_karma(message, slack, changes)
      _ -> :ok
    end
  else
    show_karma(message, slack)
  end
end
```

Elixir's [_case_](http://elixir-lang.org/getting-started/case-cond-and-if.html#case) statement is similar to `case` in C-like languages with various, cool pattern-matching capabilities. For instance, `:update` tuple is deconstructed to extract changes to the `changes` variable.

Add stubs for new functions to `slack.ex` and remove unused `say_hello`:

```
defp show_karma(%{channel: channel}, slack) do
  send_message("Showing karma", channel, slack)
  :ok
end

defp reset_karma(%{channel: channel}, slack) do
  send_message("Resetting karma", channel, slack)
  :ok
end

defp update_karma(%{channel: channel}, slack, changes) do
  send_message("Updating karma", channel, slack)
  :ok
end
```

Bot should now respond to your commands with simple messages.

Representation
--

Time to think about representing users' scores. The dictionary seems the most obvious choice with users' ids as keys and their scores as values. The dictionary equivalent in Elixir is the [map structure](http://elixir-lang.org/getting-started/keywords-and-maps.html#maps). Here's an example of such a map for storing points: 
```
%{"U1J28HCKC" => 3, "U1A2B3C4D" => -5}
```

It would be cool to have a nice wrapper module around map for reading and updating karma. Create a file for unit tests under `test/elkarmo/karma_test.exs` with the following contents:

```
defmodule Elkarmo.KarmaTest do
  use ExUnit.Case, async: true
  import Elkarmo.Karma

  @user1 "U1A2B3C4D"
  @user2 "U5A6B7C8D"
  @user3 "U1J28HCKC"

  test "empty" do
    assert empty == %{}
  end

  test "update empty list" do
    initial_karma = %{@user3 => 3, @user1 => -5}
    assert update(initial_karma, []) == initial_karma
  end

  test "update to empty karma" do
    initial_karma = empty
    to_apply = [{@user1, -5}, {@user3, 3}]
    assert update(initial_karma, to_apply) == %{@user3 => 3, @user1 => -5}
  end

  test "update to existing karma" do
    initial_karma = %{@user3 => 3, @user1 => -5}
    to_apply = [{@user1, 20}, {@user2, 6}]
    assert update(initial_karma, to_apply) == %{@user3 => 3, @user1 => 15, @user2 => 6}
  end

  test "get nonexistent user" do
    karma = %{@user1 => 50}
    assert get(karma, @user2) == nil
  end

  test "get existing user" do
    karma = %{@user1 => 50, @user2 => -4}
    assert get(karma, @user2) == -4
  end

  test "get multiple users" do
    karma = %{@user1 => 50, @user2 => -4}
    assert get(karma, [@user1, @user2, @user3]) == %{@user1 => 50, @user2 => -4, @user3 => nil}
  end
end
```

Next, create the actual implementation in `lib/elkarmo/karma.ex` (and remember to run the tests afterwards):

```
defmodule Elkarmo.Karma do
  def empty(), do: %{}

  def update(karma, []), do: karma

  def update(karma, changes) do
    changes |> Enum.reduce(karma, &do_update/2)
  end

  def get(karma, list) when is_list(list) do
    users_with_karma = for user <- list, do: {user, get(karma, user)} 
    users_with_karma |> Enum.into(%{})
  end

  def get(karma, user), do: Map.get(karma, user)

  defp do_update({user, karma_to_add}, existing_karma) do
    Map.update existing_karma, user, karma_to_add, &(&1 + karma_to_add)
  end
end
```

The new thing here is the [guard clause](http://elixir-lang.org/getting-started/case-cond-and-if.html#expressions-in-guard-clauses) `when is_list(list)`. It ensures that function `get(karma, list)` will be matched only when the `list` parameter is the actual list. Otherwise, function `get(karma, user)` will be called.

Another cool thing is the [pipe operator](http://elixir-lang.org/getting-started/enumerables-and-streams.html#the-pipe-operator) - `|>`. It appends the expression on its left side as the last parameter of the function on the right side. So, the following line:
```
changes |> Enum.reduce(karma, &do_update/2)
```
is equal to:
```
Enum.reduce(karma, &do_update/2, changes)
```

To learn more about `Enum.reduce/3`, read the [documentation](http://elixir-lang.org/docs/stable/elixir/Enum.html#reduce/3).

`&do_update/2` is the reference to function called `do_update` with two parameters.

`&(&1 + karma_to_add)` is the anonymous one-parameter function, which adds this parameter to `karma_to_add`. For more details about functions see [here](https://elixirschool.com/lessons/basics/functions).

Formatting
--

Time to implement a formatter which will turn karma representation into user-readable Slack messages. It will be shown as a list of usernames along with the score. I decided that if there's a single user with the most points there will be a thumbs-up emoji next to the score. 

Put the tests for formatter in `test/elkarmo/formatter_test.exs`:

```
defmodule Elkarmo.FormatterTest do
  use ExUnit.Case, async: true
  import Elkarmo.Formatter

  @user1 "U1A2B3C4D"
  @user2 "U5A6B7C8D"
  @user3 "U1J28HCKC"
  @user4 "U1Q2W3E4R"

  test "empty karma" do
    assert to_message(%{}) == "There's no karma yet"
  end

  test "single user" do
    karma = %{@user1 => 15}
    assert to_message(karma) == "<@#{@user1}>: 15"
  end

  test "single with nil karma" do
    karma = %{@user1 => nil}
    assert to_message(karma) == "<@#{@user1}> has no karma"
  end

  test "mulitple users" do
    karma = %{@user1 => 0, @user3 => -100, @user2 => 90, @user4 => nil}
    assert to_message(karma) <> "\n" == """
    <@#{@user2}>: 90 :+1:
    <@#{@user1}>: 0
    <@#{@user3}>: -100
    <@#{@user4}> has no karma
    """
  end

  test "don't append winner icon when there's a draw between only users" do
    karma = %{@user1 => 90, @user2 => 90}
    assert to_message(karma) <> "\n" == """
    <@#{@user1}>: 90
    <@#{@user2}>: 90
    """
  end

  test "don't append winner icon when there's a draw" do
    karma = %{@user1 => 90, @user2 => 10, @user3 => 90}
    assert to_message(karma) <> "\n" == """
    <@#{@user1}>: 90
    <@#{@user3}>: 90
    <@#{@user2}>: 10
    """
  end
end
```

And the actual implementation in `lib/elkarmo/formatter.ex`:

```
defmodule Elkarmo.Formatter do
  def to_message(map) when map == %{}, do: "There's no karma yet"
  def to_message(map) do
    {nil_karmas, karmas} = Map.to_list(map) |> Enum.partition(&has_nil_karma?/1)
    karmas = Enum.sort(karmas, &compare_karmas/2)
    all_messages = do_to_message(karmas) ++ to_nil_message(nil_karmas)
    Enum.join(all_messages, "\n")
  end

  defp to_nil_message(nil_karmas) do
    for {user, nil} <- nil_karmas, do: "<@#{user}> has no karma"
  end

  defp do_to_message([]), do: []
  defp do_to_message([{user, karma}]), do: [score(user, karma)]
  defp do_to_message([head | tail]) do 
    {_next_user, next_karma} = hd tail
    new_head = case head do
      {_user, karma} when karma > next_karma -> score(head) <> " :+1:"
      _ -> score(head)
    end
    [new_head | do_to_message_many(tail)]
  end

  defp do_to_message_many([{user, karma}]), do: [score(user, karma)]
  defp do_to_message_many([head | tail]) do 
    [score(head) | do_to_message_many(tail)]
  end
  
  defp score({user, karma}), do: score(user, karma)
  defp score(user, karma), do: "<@#{user}>: #{karma}"

  defp compare_karmas({_user1, karma1}, {_user2, karma2}), do: karma1 >= karma2
  defp has_nil_karma?({_user, karma}), do: karma == nil
end
```

Run the tests. You can also test your wrapper and formatter in _iex_: 

```
iex(1)> Elkarmo.Karma.update(Elkarmo.Karma.empty(), [{"bonnie", 8}, {"clyde", 4}]) |> Elkarmo.Formatter.to_message
"<@bonnie>: 8 :+1:\n<@clyde>: 4"
```

State and Storage
--

How to store karma values between requests? Elixir modules are stateless. You cannot store karma in a private variable inside a module like you would do with a class in C#/Java. There are few ways to deal with it in Elixir. The most common ones are [Agents](http://elixir-lang.org/getting-started/mix-otp/agent.html) and [GenServers](http://elixir-lang.org/getting-started/mix-otp/genserver.html). You'll use the latter.

The storage module will not only store karma values between calls but will also save them to file, so if the app gets restarted, karma values won't be lost. For quick file storage I used Erlang library [_dets_](http://erlang.org/doc/man/dets.html) ([Erlang can be called from Elixir](http://elixir-lang.org/crash-course.html#calling-functions) and [vice versa](http://elixir-lang.org/crash-course.html#adding-elixir-to-existing-erlang-programs)). Module will load karma from file `karma_db` on startup and save this file on every update.

Here's the implementation to save in `lib/elkarmo/store.ex`:

```
defmodule Elkarmo.Store do
  use GenServer

  @db_file :karma_db

  def start_link(karma), do: GenServer.start_link(__MODULE__, karma, name: __MODULE__)

  def get, do: GenServer.call __MODULE__, :get

  def set(new_karma), do: GenServer.cast __MODULE__, {:set, new_karma}

  def init(initial_karma) do
    {:ok, table} = :dets.open_file(@db_file, [type: :set])
    karma = case :dets.lookup(table, :karma) do
      [karma: found_karma] -> found_karma
      [] -> initial_karma
    end

    {:ok, karma}
  end

  def handle_call(:get, _from, state), do: {:reply, state, state}

  def handle_cast({:set, new_karma}, _current_karma) do
    :dets.insert(@db_file, {:karma, new_karma})
    :dets.sync(@db_file)
    {:noreply, new_karma}
  end

  def terminate(_reason, _state) do
    :dets.close(@db_file)
  end
end
```

The `init`, `handle_call`, `handle_cast` and `terminate` are _GenServer callbacks_. While `start_link`, `get` and `set` are convenience wrappers around the former. Notice how state is passed around: it's returned as the last element inside `{:reply, ...}` and `{:noreply, ...}` tuples. The state returned is then passed as the last argument to `handle_call` and `handle_cast`. I won't explain GenServers in detail, but for me they can be thought of as microservices.

Putting it all together
--
To use Elkarmo.Store GenServer it must be started first, just like `Elkarmo.Slack.start_link(...)`. It's not very convenient to do this every time so it's best to pack both `Elkarmo.Store` and `Elkarmo.Slack` into OTP application and make them start when the application is executed. In Elixir GenServers are usually started and governed by [supervisors](http://elixir-lang.org/getting-started/mix-otp/supervisor-and-application.html). Edit `lib/elkarmo.ex` and replace its contents with the following code:

```
defmodule Elkarmo do
  use Application
  
  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    slack_token = Application.get_env(:elkarmo, :slack_token)

    children = [
      worker(Elkarmo.Store, [Elkarmo.Karma.empty]),
      worker(Elkarmo.Slack, [slack_token])
    ]
    opts = [strategy: :one_for_one, name: Elkarmo.Supervisor]
    {:ok, _pid} = Supervisor.start_link children, opts
  end
end
```

This supervisor gets slack token from the application configuration (you will add it soon), registers `Elkarmo.Store` and `Elkarmo.Slack` as its children and passes default state to them (empty karma for Store and token for Slack). Store is first because Slack depends on it. Next the supervisor is started with `one_for_one` strategy (it means that if a child dies, it will be the only one restarted).

Update `application` function in `mix.exs` to register `Elkarmo` as the ["application callback module"](http://elixir-lang.org/getting-started/mix-otp/supervisor-and-application.html#the-application-callback) (the one that is started with the app):

```
def application do
  [applications: [:logger, :websocket_client, :slack],
   mod: {Elkarmo, []}]
end
```

Time to add Slack token to the configuration file. Edit `config/config.exs` and add the following line below `use Mix.Config` (remember to change the token):

```
config :elkarmo, slack_token: "YOUR_SLACK_TOKEN_GOES_HERE"
```

**Remember not to commit the configuration file with your token inside!**

Time for final changes to `elkarmo/slack.ex`. Update `show_karma`, `reset_karma`, `update_karma` and add a new function `is_cheater?`:

```
defp show_karma(%{channel: channel}, slack) do
  msg = Elkarmo.Store.get |> Elkarmo.Formatter.to_message
  send_message(msg, channel, slack)
  :ok
end

defp reset_karma(%{channel: channel}, slack) do
  Elkarmo.Store.set Elkarmo.Karma.empty
  send_message("Karma is gone :runner::dash:", channel, slack)
  :ok
end

defp update_karma(%{channel: channel, user: user}, slack, changes) do
  {cheats, valid_changes} = Enum.partition(changes, &(is_cheater?(user, &1)))
  if cheats != [], do: send_message("<@#{user}>: :middle_finger:", channel, slack)
  current_karma = Elkarmo.Store.get
  new_karma = Elkarmo.Karma.update(current_karma, valid_changes)
  Elkarmo.Store.set new_karma

  changed_users = for {user, _} <- changes, do: user
  changed_karmas = Elkarmo.Karma.get(new_karma, changed_users)

  msg = Elkarmo.Formatter.to_message changed_karmas
  send_message(msg, channel, slack)
  :ok
end

defp is_cheater?(sending_user, {user, karma}), do: sending_user == user and karma > 0
```

The last function works as a protection against users giving karma points to themselves.

That's it! Now if you run `iex -S mix` or `mix run --no-halt` the bot should connect automatically to Slack and be fully functional!

Since the application is now configured to start supervisor its best to run `mix test --no-start` when testing. Without `--no-start` it would connect to Slack.

Release
--

There are few ways to pack the application for release. Originally I used [exrm](https://github.com/bitwalker/exrm) but it turns out that it is going to be replaced by [distillery](https://github.com/bitwalker/distillery). But at the time of writing it's still in beta and seems not to work well under Windows, so use exrm instead:

Update dependencies in `mix.exs`:

```
defp deps do
[
  {:slack, "~> 0.7.0"},
  {:websocket_client, git: "https://github.com/jeremyong/websocket_client"},
  {:exrm, "~> 1.0"}
]
end
```

Run `mix do deps.get, deps.compile` to fetch exrm. If that succeeds, run `mix release`. The release will be in `rel/elkarmo` directory. The release targets the OS type that you're using, so use cannot use Linux-generated release on Windows and vice versa. To start elkarmo in the foreground run `rel/elkarmo/bin/elkarmo console` (on Windows administrator privileges might be needed). Run `rel/elkarmo/bin/elkarmo` alone to see possible options.

_I experienced some problems with Windows releases so I recommend using macOS/Linux_

The final version of the project is available at [https://github.com/happyteamio/elkarmo](https://github.com/happyteamio/elkarmo). Questions, suggestions and pull requests are welcome!
