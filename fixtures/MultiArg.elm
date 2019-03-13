module MultiArg exposing (Asset(..), complexAsset, main)


type Asset
    = Asset String String


complexAsset =
    Asset "elm_logo.svg" "elm_logo.svg"


main : Program () Asset msg
main =
    Platform.worker { init = \_ -> ( complexAsset, Cmd.none ), update = \_ m -> ( m, Cmd.none ), subscriptions = always Sub.none }
