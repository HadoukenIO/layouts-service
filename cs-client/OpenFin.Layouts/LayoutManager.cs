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
        internal const string LayoutsHostAppUuid = "of-layouts-dotnet-host";
        private const string LayoutsHelperAppUrl = "about:blank";

        private const string LayoutsServiceManifestUrl = "https://cdn.openfin.co/services/openfin/layouts/app.json";

        private static Fin.Runtime RuntimeInstance;

        private Fin.ExternalWindowObserver _observer;


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

        public WindowLayoutManager(IntPtr handle)
        {
            ObservedWindowName = Guid.NewGuid().ToString();
            _observer = new Fin.ExternalWindowObserver(RuntimeInstance, LayoutsHostAppUuid, ObservedWindowName, handle);

            Grouping = new WindowGroupingManager(this);
            Workspace = new WorkspaceManager();
        }

        internal static Fin.ChannelClient ChannelClient { get; private set; }

        internal string ObservedWindowName { get; private set; }

        public WindowGroupingManager Grouping { get; private set; }
        public WorkspaceManager Workspace { get; private set; }

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
    }

    public class WindowGroupingManager
    {
        WindowLayoutManager _layoutManager;

        public event EventHandler WindowGrouped;
        public event EventHandler WindowUngrouped;

        internal WindowGroupingManager(WindowLayoutManager layoutManager)
        {
            _layoutManager = layoutManager;
        }

        public void Ungroup()
        {
            WindowLayoutManager.ChannelClient.Dispatch<object>("UNDOCK-WINDOW", new
            {
                uuid = WindowLayoutManager.LayoutsHostAppUuid,
                name = _layoutManager.ObservedWindowName
            });
        }
        public void UngroupAll()
        {
            WindowLayoutManager.ChannelClient.Dispatch<object>("UNDOCK-WINDOW", new
            {
                uuid = WindowLayoutManager.LayoutsHostAppUuid,
                name = _layoutManager.ObservedWindowName
            });
        }
    }

}

namespace OpenFin.Layouts
{ 
    using Newtonsoft.Json.Linq;
    public class WorkspaceManager
    {
        public event EventHandler WorkspaceGenerating;
        public event EventHandler WorkspaceGenerated;
        public event EventHandler WorkspaceRestoring;
        public event EventHandler WorkspaceRestored;

        public Task<JObject> GenerateWorkspace()
        {
            return WindowLayoutManager.ChannelClient.Dispatch<JObject>("GENERATE-WORKSPACE", new object());
        }

        public Task Restore(JObject workspace)
        {
            return WindowLayoutManager.ChannelClient.Dispatch<JObject>("RESTORE-WORKSPACE", workspace);
        }
    }
}
