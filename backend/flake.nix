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
          sqlalchemy # ORM
          asyncpg # async postgres driver
          alembic # database migrations
          passlib # password hashing
          bcrypt # hashing backend for passlib
          python-jose # JWT tokens
          pydantic-settings # environment variable management
          google-genai
          httpx
        ]);
    in {
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          pythonEnv
          # Database
          postgresql # local postgres for dev
          pgcli # nicer postgres CLI with autocomplete

          # Frontend
          nodejs_25 # node runtime

          # Dev utilities
          direnv # auto-loads .env when entering project folder
          httpie # friendly HTTP client for testing endpoints (http GET localhost:8000/health)
          jq # pretty print JSON responses in terminal

          # Misc
          git
        ];
        shellHook = ''
          echo " Hackathon Shell Loaded"
          echo "  Backend:  uvicorn main:app --reload"
          echo "  Frontend: npm run dev"
        '';
      };
    });
}
