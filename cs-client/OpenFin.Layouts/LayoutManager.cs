using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Fin = Openfin.Desktop;

namespace OpenFin.Layouts
{
    public class WindowLayoutManager
    {
        private const string LayoutsServiceChannelName = "of-layouts-service-v1";
        private const string LayoutsHostAppUuid = "of-layouts-dotnet-host";
        private const string LayoutsHelperAppUrl = "about:blank";

        private const string LayoutsServiceManifestUrl = "https://cdn.openfin.co/services/openfin/layouts/app.json";

        private static Fin.Runtime RuntimeInstance;
        private static Fin.ChannelClient ChannelClient;

        private string _observedWindowName;
        private Fin.ExternalWindowObserver _observer;

        public WindowLayoutManager(IntPtr handle)
        {
            _observedWindowName = Guid.NewGuid().ToString();
            _observer = new Fin.ExternalWindowObserver(RuntimeInstance, LayoutsHostAppUuid, _observedWindowName, handle);
        }

        public static void Initialize()
        {
            Initialize(new Uri(LayoutsServiceManifestUrl));
        }

        public static void Initialize(Uri manifestUri)
        {
            var runtimeOptions = Fin.RuntimeOptions.LoadManifest(manifestUri);

            RuntimeInstance = Fin.Runtime.GetRuntimeInstance(runtimeOptions);
            RuntimeInstance.Connect(() => 
            {
                var layoutsService = RuntimeInstance.CreateApplication(runtimeOptions.StartupApplicationOptions);

                layoutsService.isRunning(ack =>
                {
                    if (!(bool)(ack.getData() as Newtonsoft.Json.Linq.JValue).Value)
                    {
                        layoutsService.run();
                    }

                    ChannelClient = RuntimeInstance.InterApplicationBus.Channel.CreateClient(LayoutsServiceChannelName);
                    ChannelClient.Connect();
                });
            });
        }

        public void Register()
        {
            RuntimeInstance.Connect(() =>
            {
                var appOptions = new Fin.ApplicationOptions(LayoutsHostAppUuid, LayoutsHostAppUuid, LayoutsHelperAppUrl);
                var layoutsHostApp = RuntimeInstance.CreateApplication(appOptions);

                layoutsHostApp.isRunning(ack =>
                {
                    if (!(bool)(ack.getData() as Newtonsoft.Json.Linq.JValue).Value)
                    {
                        layoutsHostApp.run();
                    }

                    _observer.onReady();
                });
            });
        }

        public void Ungroup()
        {
            ChannelClient.Dispatch<object>("undockWindow", new
            {
                uuid = LayoutsHostAppUuid,
                name = _observedWindowName
            });
        }

        public void UngroupAll()
        {
            ChannelClient.Dispatch<object>("undockGroup", new
            {
                uuid = LayoutsHostAppUuid,
                name = _observedWindowName
            });
        }
    }
}
