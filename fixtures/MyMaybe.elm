module MyMaybe exposing (MyMaybe(..), coreJust, main, myJust)

import Maybe


type MyMaybe a
    = Just a
    | MyNothing


coreJust =
    Maybe.Just "dont_touch_me.png"


myJust =
    Just "elm_logo.svg"


main : Program () ( MyMaybe String, Maybe String ) msg
main =
    Platform.worker { init = \_ -> ( ( myJust, coreJust ), Cmd.none ), update = \_ m -> ( m, Cmd.none ), subscriptions = always Sub.none }
