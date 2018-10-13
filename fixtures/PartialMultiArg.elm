module PartialMultiArg exposing (Asset(..), main, partialAsset)


type Asset
    = AssetPair String String


partialAsset =
    AssetPair "elm_logo.svg"


main : Program () Asset msg
main =
    Platform.worker
        { init = \_ -> ( partialAsset "elm_logo.svg", Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
