{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    flake-utils,
    nixpkgs,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};

      pythonEnv = pkgs.python313.withPackages (ps:
        with ps; [
          fastapi # web framework
          uvicorn # ASGI server for dev
          gunicorn # production server managing uvicorn workers
          google-genai
          httpx
        ]);
    in {
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          pythonEnv

          # Dev utilities
          direnv # auto-loads .env when entering project folder
          httpie # friendly HTTP client for testing endpoints (http GET localhost:8000/health)
          jq # pretty print JSON responses in terminal

          # Misc
          git
        ];
        shellHook = ''
          echo " Hackathon Shell Loaded "

          if [ ! -d .venv ]; then
            echo "Creating virtual environment..."
            python -m venv .venv
          fi

          source .venv/bin/activate
          pip install -q fastapi \
            google-genai \
            httpx mediapipe pillow numpy

          alias backend="uvicorn main:app --reload"
          alias frontend="cd frontend && npm run dev"
        '';
      };
    });
}
