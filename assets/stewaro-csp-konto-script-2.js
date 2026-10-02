
      (() => {
        try {
          const session = JSON.parse(sessionStorage.getItem("scb_web_session") || "null");
          const product = session?.product_context;
          if (product !== "senioren" && product !== "prime") return;
          sessionStorage.setItem("nahwerk_product", product);
          document.body.dataset.product = product;
          document.body.classList.toggle("senior-product", product === "senioren");
        } catch (_) {}
      })();
    