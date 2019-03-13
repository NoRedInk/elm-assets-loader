module Just exposing (main, model)


model : Maybe String
model =
    Just "elm_logo.svg"


main : Program () (Maybe String) msg
main =
    Platform.worker { init = \_ -> ( model, Cmd.none ), update = \_ m -> ( m, Cmd.none ), subscriptions = always Sub.none }
