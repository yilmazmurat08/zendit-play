package com.zendit.play;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;

/**
 * Lays its children out left to right and wraps to a new row when the next one does not fit,
 * so the player's tool chips (Ses, Altyazı, Hız...) always stay inside the screen instead of
 * running off the edge on a phone. Children's margins are respected; GONE children are skipped.
 */
public class ZpFlowLayout extends ViewGroup {
    private int rowSpacing;

    public ZpFlowLayout(Context context) {
        this(context, null);
    }

    public ZpFlowLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        rowSpacing = Math.round(8 * context.getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int maxWidth = MeasureSpec.getSize(widthMeasureSpec) - getPaddingLeft() - getPaddingRight();
        boolean bounded = MeasureSpec.getMode(widthMeasureSpec) != MeasureSpec.UNSPECIFIED;
        int x = 0;
        int rowHeight = 0;
        int height = 0;
        int usedWidth = 0;
        boolean first = true;
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child.getVisibility() == GONE) continue;
            measureChildWithMargins(child, widthMeasureSpec, 0, heightMeasureSpec, 0);
            MarginLayoutParams lp = (MarginLayoutParams) child.getLayoutParams();
            int w = child.getMeasuredWidth() + lp.leftMargin + lp.rightMargin;
            int h = child.getMeasuredHeight() + lp.topMargin + lp.bottomMargin;
            if (!first && bounded && x + w > maxWidth) {
                height += rowHeight + rowSpacing;
                x = 0;
                rowHeight = 0;
            }
            x += w;
            usedWidth = Math.max(usedWidth, x);
            rowHeight = Math.max(rowHeight, h);
            first = false;
        }
        height += rowHeight;
        int width = bounded ? MeasureSpec.getSize(widthMeasureSpec) : usedWidth + getPaddingLeft() + getPaddingRight();
        setMeasuredDimension(width, resolveSize(height + getPaddingTop() + getPaddingBottom(), heightMeasureSpec));
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
        int maxWidth = r - l - getPaddingLeft() - getPaddingRight();
        int x = 0;
        int y = getPaddingTop();
        int rowHeight = 0;
        boolean first = true;
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child.getVisibility() == GONE) continue;
            MarginLayoutParams lp = (MarginLayoutParams) child.getLayoutParams();
            int w = child.getMeasuredWidth() + lp.leftMargin + lp.rightMargin;
            int h = child.getMeasuredHeight() + lp.topMargin + lp.bottomMargin;
            if (!first && x + w > maxWidth) {
                y += rowHeight + rowSpacing;
                x = 0;
                rowHeight = 0;
            }
            int left = getPaddingLeft() + x + lp.leftMargin;
            int top = y + lp.topMargin;
            child.layout(left, top, left + child.getMeasuredWidth(), top + child.getMeasuredHeight());
            x += w;
            rowHeight = Math.max(rowHeight, h);
            first = false;
        }
    }

    @Override
    public LayoutParams generateLayoutParams(AttributeSet attrs) {
        return new MarginLayoutParams(getContext(), attrs);
    }

    @Override
    protected LayoutParams generateDefaultLayoutParams() {
        return new MarginLayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
    }

    @Override
    protected LayoutParams generateLayoutParams(LayoutParams p) {
        return new MarginLayoutParams(p);
    }

    @Override
    protected boolean checkLayoutParams(LayoutParams p) {
        return p instanceof MarginLayoutParams;
    }
}
