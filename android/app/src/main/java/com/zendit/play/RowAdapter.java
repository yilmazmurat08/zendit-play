package com.zendit.play;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;

/* loaded from: classes7.dex */
final class RowAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private static final int TYPE_HEADER = 1;
    private static final int TYPE_ROW = 0;
    private OnPick onPick;
    private final List<Row> rows = new ArrayList();

    interface OnPick {
        void onPick(int i);
    }

    public static /* synthetic */ void $r8$lambda$LmN8JK_FTHY_AhB1nTWT2fate_g(RowAdapter rowAdapter, RowHolder rowHolder, View view) {
        rowAdapter.lambda$onBindViewHolder$0(rowHolder, view);
    }

    RowAdapter() {
    }

    static final class Row {
        boolean checked;
        boolean current;
        boolean header;
        String number = "";
        String title = "";
        String subtitle = "";
        int progress = -1;
        boolean enabled = true;

        Row() {
        }

        static Row header(String title) {
            Row r = new Row();
            r.title = title;
            r.header = true;
            r.enabled = false;
            return r;
        }

        static Row option(String title, String subtitle, boolean checked) {
            Row r = new Row();
            r.title = title;
            r.subtitle = subtitle == null ? "" : subtitle;
            r.checked = checked;
            return r;
        }
    }

    void submit(List<Row> newRows, OnPick pick) {
        this.rows.clear();
        this.rows.addAll(newRows);
        this.onPick = pick;
        notifyDataSetChanged();
    }

    @Override // androidx.recyclerview.widget.RecyclerView.Adapter
    public int getItemCount() {
        return this.rows.size();
    }

    @Override // androidx.recyclerview.widget.RecyclerView.Adapter
    public int getItemViewType(int i) {
        return this.rows.get(i).header ? 1 : 0;
    }

    @Override // androidx.recyclerview.widget.RecyclerView.Adapter
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        if (viewType != 1) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.zendit_player_row, parent, false);
            return new RowHolder(view);
        }
        TextView header = new TextView(parent.getContext());
        float density = parent.getResources().getDisplayMetrics().density;
        header.setLayoutParams(new RecyclerView.LayoutParams(-1, -2));
        header.setPadding((int) (density * 24.0f), (int) (18.0f * density), (int) (24.0f * density), (int) (6.0f * density));
        header.setTextColor(ContextCompat.getColor(parent.getContext(), R.color.zp_muted));
        header.setTextSize(2, 12.0f);
        header.setLetterSpacing(0.08f);
        header.setAllCaps(true);
        header.setFocusable(false);
        return new RecyclerView.ViewHolder(header) { // from class: com.zendit.play.RowAdapter.1
        };
    }

    @Override // androidx.recyclerview.widget.RecyclerView.Adapter
    public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
        Row row = this.rows.get(position);
        if (row.header) {
            ((TextView) holder.itemView).setText(row.title);
            return;
        }
        final RowHolder h = (RowHolder) holder;
        h.number.setText(row.number);
        h.number.setVisibility(row.number.isEmpty() ? 8 : 0);
        h.title.setText(row.title);
        h.subtitle.setText(row.subtitle);
        h.subtitle.setVisibility(row.subtitle.isEmpty() ? 8 : 0);
        h.progress.setVisibility(row.progress >= 0 ? 0 : 8);
        h.progress.setProgress(Math.max(0, row.progress));
        h.check.setVisibility(row.checked ? 0 : 4);
        h.itemView.setActivated(row.current);
        h.itemView.setEnabled(row.enabled);
        h.itemView.setAlpha(row.enabled ? 1.0f : 0.5f);
        h.itemView.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.RowAdapter$$ExternalSyntheticLambda0
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                RowAdapter.$r8$lambda$LmN8JK_FTHY_AhB1nTWT2fate_g(RowAdapter.this, h, view);
            }
        });
    }

    private /* synthetic */ void lambda$onBindViewHolder$0(RowHolder h, View v) {
        int pos = h.getBindingAdapterPosition();
        if (pos != -1 && this.onPick != null && this.rows.get(pos).enabled) {
            this.onPick.onPick(pos);
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    static final class RowHolder extends RecyclerView.ViewHolder {
        final ImageView check;
        final TextView number;
        final ProgressBar progress;
        final TextView subtitle;
        final TextView title;

        RowHolder(View view) {
            super(view);
            this.number = (TextView) view.findViewById(R.id.zp_row_number);
            this.title = (TextView) view.findViewById(R.id.zp_row_title);
            this.subtitle = (TextView) view.findViewById(R.id.zp_row_subtitle);
            this.progress = (ProgressBar) view.findViewById(R.id.zp_row_progress);
            this.check = (ImageView) view.findViewById(R.id.zp_row_check);
        }
    }
}
