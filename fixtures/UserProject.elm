module UserProject exposing (Asset(..), cornucopia, main)


type Asset
    = Asset String


cornucopia =
    Asset "elm_logo.svg"


main : Program () Asset msg
main =
    Platform.worker { init = \_ -> ( cornucopia, Cmd.none ), update = \_ m -> ( m, Cmd.none ), subscriptions = always Sub.none }
