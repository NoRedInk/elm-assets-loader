module LocalPathOverride exposing (Asset(..), asset, main)


type Asset
    = Asset String


asset =
    Asset "non_sensical.png"


main : Program () Asset msg
main =
    Platform.worker
        { init = \_ -> ( asset, Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
