package com.zendit.play;

import android.content.Context;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewConfiguration;

/* loaded from: classes7.dex */
final class PlayerGestures implements View.OnTouchListener {
    private static final int BLOCKED = 4;
    private static final int BRIGHTNESS = 2;
    private static final int NONE = 0;
    private static final int SEEK = 1;
    private static final int VOLUME = 3;
    private final Callbacks callbacks;
    private final GestureDetector detector;
    private float downX;
    private float downY;
    private float lastY;
    private boolean longPressing;
    private final ScaleGestureDetector scaleDetector;
    private boolean scaling;
    private final int slop;
    private boolean startedAtEdge;
    private int mode = 0;
    private float width = 1.0f;
    private float height = 1.0f;
    private float scaleTotal = 1.0f;

    interface Callbacks {
        boolean canSeek();

        boolean isLocked();

        void onBrightnessDelta(float f);

        void onDoubleTap(int i);

        void onLongPressEnd();

        boolean onLongPressStart();

        void onPinch(float f);

        void onSeekCommit(long j);

        void onSeekPreview(long j);

        void onSingleTap();

        void onVerticalEnd();

        void onVolumeDelta(float f);

        long seekRangeMs();
    }

    PlayerGestures(Context context, final Callbacks callbacks) {
        this.callbacks = callbacks;
        this.slop = ViewConfiguration.get(context).getScaledTouchSlop() * 2;
        this.detector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() { // from class: com.zendit.play.PlayerGestures.1
            @Override // android.view.GestureDetector.SimpleOnGestureListener, android.view.GestureDetector.OnGestureListener
            public boolean onDown(MotionEvent e) {
                return true;
            }

            @Override // android.view.GestureDetector.SimpleOnGestureListener, android.view.GestureDetector.OnDoubleTapListener
            public boolean onSingleTapConfirmed(MotionEvent e) {
                if (PlayerGestures.this.mode == 0 && !PlayerGestures.this.scaling) {
                    callbacks.onSingleTap();
                    return true;
                }
                return true;
            }

            @Override // android.view.GestureDetector.SimpleOnGestureListener, android.view.GestureDetector.OnDoubleTapListener
            public boolean onDoubleTap(MotionEvent e) {
                if (!callbacks.isLocked() && !PlayerGestures.this.scaling) {
                    int zone = e.getX() < PlayerGestures.this.width / 3.0f ? -1 : e.getX() > (PlayerGestures.this.width * 2.0f) / 3.0f ? 1 : 0;
                    callbacks.onDoubleTap(zone);
                }
                return true;
            }

            @Override // android.view.GestureDetector.SimpleOnGestureListener, android.view.GestureDetector.OnGestureListener
            public void onLongPress(MotionEvent e) {
                if (PlayerGestures.this.mode == 0 && !PlayerGestures.this.scaling && !callbacks.isLocked()) {
                    PlayerGestures.this.longPressing = callbacks.onLongPressStart();
                }
            }
        });
        this.scaleDetector = new ScaleGestureDetector(context, new ScaleGestureDetector.SimpleOnScaleGestureListener() { // from class: com.zendit.play.PlayerGestures.2
            @Override // android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, android.view.ScaleGestureDetector.OnScaleGestureListener
            public boolean onScaleBegin(ScaleGestureDetector d) {
                if (callbacks.isLocked()) {
                    return false;
                }
                PlayerGestures.this.scaling = true;
                PlayerGestures.this.scaleTotal = 1.0f;
                return true;
            }

            @Override // android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, android.view.ScaleGestureDetector.OnScaleGestureListener
            public boolean onScale(ScaleGestureDetector d) {
                PlayerGestures.this.scaleTotal *= d.getScaleFactor();
                return true;
            }

            @Override // android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, android.view.ScaleGestureDetector.OnScaleGestureListener
            public void onScaleEnd(ScaleGestureDetector d) {
                callbacks.onPinch(PlayerGestures.this.scaleTotal);
            }
        });
    }

    /* JADX WARN: Can't fix incorrect switch cases order, some code will duplicate */
    @Override // android.view.View.OnTouchListener
    public boolean onTouch(View v, MotionEvent e) {
        this.width = Math.max(1, v.getWidth());
        this.height = Math.max(1, v.getHeight());
        this.scaleDetector.onTouchEvent(e);
        this.detector.onTouchEvent(e);
        switch (e.getActionMasked()) {
            case 0:
                this.mode = 0;
                this.scaling = false;
                this.longPressing = false;
                this.downX = e.getX();
                this.downY = e.getY();
                this.lastY = this.downY;
                this.startedAtEdge = this.downY < this.height * 0.06f || this.downY > this.height * 0.94f || this.downX < this.width * 0.04f || this.downX > this.width * 0.96f;
                return true;
            case 1:
            case 3:
                if (this.mode == 1) {
                    this.callbacks.onSeekCommit(e.getActionMasked() == 1 ? seekDelta(e.getX() - this.downX) : 0L);
                } else if (this.mode == 2 || this.mode == 3) {
                    this.callbacks.onVerticalEnd();
                }
                if (this.longPressing) {
                    this.longPressing = false;
                    this.callbacks.onLongPressEnd();
                }
                this.mode = 0;
                return true;
            case 2:
                if (!this.scaling && !this.longPressing && !this.startedAtEdge && !this.callbacks.isLocked() && e.getPointerCount() <= 1) {
                    float dx = e.getX() - this.downX;
                    float dy = e.getY() - this.downY;
                    if (this.mode == 0 && Math.hypot(dx, dy) > this.slop) {
                        if (Math.abs(dx) > Math.abs(dy)) {
                            this.mode = this.callbacks.canSeek() ? 1 : 4;
                        } else {
                            this.mode = this.downX < this.width / 2.0f ? 2 : 3;
                        }
                        this.lastY = e.getY();
                    }
                    if (this.mode == 1) {
                        this.callbacks.onSeekPreview(seekDelta(dx));
                    } else if (this.mode == 2 || this.mode == 3) {
                        float delta = (this.lastY - e.getY()) / (this.height * 0.7f);
                        this.lastY = e.getY();
                        if (this.mode == 2) {
                            this.callbacks.onBrightnessDelta(delta);
                        } else {
                            this.callbacks.onVolumeDelta(delta);
                        }
                    }
                }
                return true;
            case 4:
            default:
                return true;
            case 5:
                if (this.mode == 2 || this.mode == 3) {
                    this.callbacks.onVerticalEnd();
                }
                this.mode = 4;
                return true;
        }
    }

    private long seekDelta(float dx) {
        return (long) ((dx / this.width) * this.callbacks.seekRangeMs());
    }
}
